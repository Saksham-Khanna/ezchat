const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = parseInt(process.env.PORT || 5001, 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const User = require('./models/User');
const Group = require('./models/Group');

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    // Reset all users to offline on startup to handle crashes
    try {
      await User.updateMany({}, { is_online: false });
      console.log('All users reset to offline status on startup.');
    } catch (err) {
      console.error('Error resetting user status:', err);
    }
    
    startServer(PORT);
  })
  .catch((error) => console.error('MongoDB connection error:', error));

// Routes
app.get('/', (req, res) => {
  res.send('ezchat Backend is running with MongoDB!');
});

// Import Routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this for production
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

// Socket.IO Logic
const userSocketMap = new Map(); // socketId -> userId

// --- WiFi Mode Signaling & Discovery --- (Global Scope)
const wifiUsers = new Map(); // networkId -> Map(userId -> userData)
const roomManager = require('./roomManager');
const roleManager = require('./roleManager');

const getNetworkId = (socket) => {
  return 'global_network';
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', async (userId) => {
    if (userId) {
      socket.join(userId.toString());
      userSocketMap.set(socket.id, userId.toString());
      console.log(`User ${userId} joined their room: ${userId}`);

      // Mark user as online in DB
      try {
        const user = await User.findByIdAndUpdate(userId, { is_online: true }, { new: true })
          .populate('friends', '_id');
        if (user && user.friends) {
          // Notify all friends that this user is now online
          user.friends.forEach(friend => {
            io.to(friend._id.toString()).emit('friend_status', {
              userId: userId.toString(),
              is_online: true,
            });
          });
        }
      } catch (err) {
        console.error('Error setting user online:', err);
      }

      // Join all groups the user is a member of
      try {
        const userGroups = await Group.find({ 'members.userId': userId });
        userGroups.forEach(group => {
          socket.join(group.room_id);
          console.log(`User ${userId} auto-joined group room: ${group.room_id}`);
        });
      } catch (err) {
        console.error('Error auto-joining groups:', err);
      }
    } else {
      console.warn('Join attempt without userId');
    }
  });

  socket.on('send_message', (data) => {
    // data: { sender_id, recipient_id, content, ... }
    const sender_id = data.sender_id?.toString();
    const recipient_id = data.recipient_id?.toString();
    
    console.log(`Message from ${sender_id} to ${recipient_id}: ${data.content?.substring(0, 20)}...`);
    
    if (recipient_id) {
      // Ensure we emit stringified IDs
      const emitData = { ...data, sender_id, recipient_id };
      io.to(recipient_id).emit('receive_message', emitData);
      console.log(`Emitted receive_message to room: ${recipient_id}`);
    } else {
      console.error('send_message failed: recipient_id is missing', data);
    }
  });

  socket.on('typing', (data) => {
    // data: { sender_id, recipient_id, is_typing, username, avatar_url }
    const recipient_id = data.recipient_id?.toString();
    if (recipient_id) {
      io.to(recipient_id).emit('user_typing', {
        userId: data.sender_id?.toString(),
        is_typing: data.is_typing,
        username: data.username,
        avatar_url: data.avatar_url,
      });
    }
  });

  socket.on('mark_read', (data) => {
    // data: { readerId, senderId }
    // Notify the sender that the reader has seen their messages
    const senderId = data.senderId?.toString();
    if (senderId) {
      io.to(senderId).emit('messages_read', {
        readerId: data.readerId?.toString(),
      });
    }
  });

  socket.on('disconnect', async () => {
    const userId = userSocketMap.get(socket.id);
    userSocketMap.delete(socket.id);
    console.log(`User ${userId || 'unknown'} disconnected (Socket: ${socket.id}). Remaining sockets: ${userSocketMap.size}`);

    if (userId) {
      // Check if user has any other active sockets (multiple tabs)
      const isStillConnected = Array.from(userSocketMap.values()).includes(userId);
      
      // Also remove from any WiFi networks and rooms
      for (const [networkId, users] of wifiUsers.entries()) {
        for (const [uId, userData] of users.entries()) {
          if (userData.socketId === socket.id) {
            users.delete(uId);
            socket.to(`wifi_${networkId}`).emit('wifi_user_left', { userId: uId });
            console.log(`User ${uId} removed from WiFi ${networkId} on disconnect`);

            // Also check all rooms in this network
            const rooms = roomManager.getNetworkRooms(networkId);
            for (const [roomId, room] of rooms.entries()) {
              if (room.members.some(m => m.userId === uId)) {
                const result = roomManager.leaveRoom(networkId, roomId, uId);
                if (result === null) {
                  io.to(roomId).emit('wifi_room_closed', { roomId });
                  io.to(`wifi_${networkId}`).emit('wifi_room_deleted', { roomId });
                } else {
                  io.to(roomId).emit('wifi_room_user_left', { roomId, userId: uId, members: result.members });
                }
              }
            }
          }
        }
      }

      if (!isStillConnected) {
        console.log(`User ${userId} has no more active connections. Marking offline.`);
        // No more connections for this user — mark offline in DB
        try {
          const user = await User.findByIdAndUpdate(userId, { 
            is_online: false,
            last_seen: new Date() 
          }, { new: true })
            .populate('friends', '_id');
          if (user && user.friends) {
            // Notify all friends that this user is now offline
            user.friends.forEach(friend => {
              io.to(friend._id.toString()).emit('friend_status', {
                userId: userId,
                is_online: false,
                last_seen: user.last_seen
              });
            });
          }
        } catch (err) {
          console.error('Error setting user offline:', err);
        }
      } else {
        console.log(`User ${userId} still has other active connections.`);
      }
    }
  });

  socket.on('edit_message', (data) => {
    // data: { messageId, sender_id, recipient_id, content }
    const recipient_id = data.recipient_id?.toString();
    if (recipient_id) {
      io.to(recipient_id).emit('message_edited', data);
    }
  });

  socket.on('react_message', (data) => {
    // data: { messageId, sender_id, recipient_id, reactions }
    const recipient_id = data.recipient_id?.toString();
    if (recipient_id) {
      io.to(recipient_id).emit('message_reaction_update', data);
    }
  });

  const getDiscoveryPayload = async (networkId) => {
    try {
      const usersInNet = wifiUsers.get(networkId);
      
      const activeAppUsers = usersInNet ? Array.from(usersInNet.values()).map(u => ({
        userId: u.userId,
        username: u.username,
        avatarUrl: u.avatarUrl,
        cv_id: u.cv_id,
        networkId: u.networkId
      })) : [];

      return { 
        users: activeAppUsers 
      };
    } catch (e) {
      console.error('Error getting discovery payload', e);
      return { users: [] };
    }
  };

  socket.on('join_wifi', async (data) => {
    // data: { wifiName, userId, username, avatarUrl }
    const networkId = data.wifiName || getNetworkId(socket);
    const userId = data.userId?.toString();
    if (!userId) return;

    socket.join(`wifi_${networkId}`);
    if (!wifiUsers.has(networkId)) wifiUsers.set(networkId, new Map());
    
    // Add/Update user data for discovery
    const userData = { ...data, userId, networkId, socketId: socket.id };
    wifiUsers.get(networkId).set(userId, userData);

    console.log(`User ${userId} joined WiFi Network: ${networkId}`);
    
    // Broadcast join to others on the same WiFi
    socket.to(`wifi_${networkId}`).emit('wifi_user_joined', userData);
    
    const payload = await getDiscoveryPayload(networkId);
    socket.emit('wifi_discovery_update', payload);
  });

  socket.on('scan_wifi_network', async (data) => {
    // data: { wifiName }
    const networkId = (data && data.wifiName) || getNetworkId(socket);
    const payload = await getDiscoveryPayload(networkId);
    socket.emit('wifi_discovery_update', payload);
  });

  socket.on('leave_wifi', (data) => {
    const networkId = data.wifiName || getNetworkId(socket);
    const userId = data.userId?.toString();
    
    if (wifiUsers.has(networkId)) {
      wifiUsers.get(networkId).delete(userId);
      socket.leave(`wifi_${networkId}`);
      socket.to(`wifi_${networkId}`).emit('wifi_user_left', { userId });
      console.log(`User ${userId} left WiFi Network: ${networkId}`);
    }
  });

  socket.on('p2p_signal', (data) => {
    // data: { to, from, signal, type }
    const { to } = data;
    if (to) {
      io.to(to).emit('p2p_signal', data);
    }
  });

  socket.on('p2p_connect_request', (data) => {
    // data: { to, from, fromUsername, fromAvatar }
    if (data.to) {
      io.to(data.to).emit('p2p_connect_request', data);
    }
  });

  socket.on('p2p_connect_accepted', (data) => {
    // data: { to, from, fromUsername }
    if (data.to) {
      io.to(data.to).emit('p2p_connect_accepted', data);
    }
  });

  socket.on('p2p_connect_rejected', (data) => {
    // data: { to, from, fromUsername }
    if (data.to) {
      io.to(data.to).emit('p2p_connect_rejected', data);
    }
  });

  socket.on('create_wifi_room', (data) => {
    // data: { wifiName, roomName, description, creatorId, isPrivate, inviteCode, username, avatar_url }
    const networkId = data.wifiName || getNetworkId(socket);
    const roomData = roomManager.createRoom(networkId, data);
    
    socket.join(roomData.room_id);
    
    console.log(`Room created: ${roomData.room_id} by ${data.creatorId}`);
  });

  socket.on('join_wifi_room', async (data) => {
    // data: { roomId, userId, networkId, username, avatar_url, inviteCode }
    const { roomId, userId } = data;
    if (!roomId || !userId) return;
    
    const networkId = data.networkId || getNetworkId(socket);
    console.log(`Join attempt: room ${roomId} by user ${userId} on net ${networkId}`);
    let room = roomManager.getRoom(networkId, roomId);

    // If not in roomManager, check database (persistent groups)
    if (!room) {
      console.log(`Room ${roomId} not in memory, checking DB...`);
      const dbGroup = await Group.findOne({ room_id: roomId }).populate('members.userId', 'username avatar_url');
      if (dbGroup) {
        console.log(`Found persistent group in DB: ${dbGroup.roomName}`);
        room = {
          room_id: dbGroup.room_id,
          roomName: dbGroup.roomName,
          members: dbGroup.members.map(m => ({
            userId: m.userId?._id?.toString() || m.userId?.toString(),
            username: m.userId?.username || 'Unknown User',
            avatar_url: m.userId?.avatar_url || '',
            role: m.role || 'member'
          })),
          isPrivate: dbGroup.isPrivate,
          inviteCode: dbGroup.password,
          networkId: networkId || "local",
          is_db: true
        };
      }
    }

    if (!room) {
      socket.emit('room_error', { message: 'Room not found' });
      return;
    }

    if (room.isPrivate && room.inviteCode !== data.inviteCode) {
      socket.emit('room_error', { message: 'Invalid invite code' });
      return;
    }

    let updatedRoom;
    if (room.is_db) {
       // It's a persistent group, skip roomManager.joinRoom (already joined in DB)
       updatedRoom = room;
    } else {
       const { room: ur, error } = roomManager.joinRoom(networkId, roomId, data);
       if (error) {
         socket.emit('room_error', { message: error });
         return;
       }
       updatedRoom = ur;
    }

    socket.join(roomId);
    
    // Notify others in the room
    io.to(roomId).emit('wifi_room_user_joined', { 
      roomId, 
      userId, 
      username: data.username, 
      avatar_url: data.avatar_url,
      role: 'member',
      members: updatedRoom.members
    });

    // Emit system message
    io.to(roomId).emit('receive_message', {
      _id: `sys_${Date.now()}`,
      sender_id: 'system',
      recipient_id: roomId,
      content: `${data.username} joined the room`,
      createdAt: new Date().toISOString(),
      type: 'system'
    });
    
    // Send room info to the joiner
    socket.emit('wifi_room_joined', updatedRoom);

    const usersInNetwork = wifiUsers.get(networkId);
    if (usersInNetwork) {
      const peerIds = updatedRoom.members
        .map(m => m.userId)
        .filter(uId => uId !== userId.toString());
      socket.emit('wifi_room_participants', { roomId, peerIds });
    }
  });

   socket.on('leave_wifi_room', (data) => {
    const { roomId, userId } = data;
    const networkId = data.networkId || getNetworkId(socket);
    
    // Only use roomManager if the room exists there (ephemeral rooms)
    const ephemeralRoom = roomManager.getRoom(networkId, roomId);
    
    if (ephemeralRoom) {
      const result = roomManager.leaveRoom(networkId, roomId, userId);
      
      socket.leave(roomId);

      if (result === null) {
        // Ephemeral room closed
        io.to(roomId).emit('wifi_room_closed', { roomId });
        io.to(`wifi_${networkId}`).emit('wifi_room_deleted', { roomId });
      } else {
        io.to(roomId).emit('wifi_room_user_left', { roomId, userId, members: result.members });
        
        io.to(roomId).emit('receive_message', {
          _id: `sys_${Date.now()}`,
          sender_id: 'system',
          recipient_id: roomId,
          content: `A user left the room`,
          createdAt: new Date().toISOString(),
          type: 'system'
        });
      }
    } else {
      // Persistent room or room already gone - just unsync the socket
      socket.leave(roomId);
      console.log(`User ${userId} left persistent/missing room ${roomId}`);
    }
  });

  socket.on('remove_wifi_user', (data) => {
    // data: { roomId, userId (remover), targetId }
    const networkId = data.networkId || getNetworkId(socket);
    if (roleManager.canPerformAction(networkId, data.roomId, data.userId, 'remove_user')) {
      const updatedRoom = roomManager.removeUser(networkId, data.roomId, data.targetId);
      if (updatedRoom) {
        io.to(data.roomId).emit('wifi_room_user_removed', { 
          roomId: data.roomId, 
          targetId: data.targetId,
          members: updatedRoom.members
        });
      }
    } else {
      socket.emit('room_error', { message: 'Permission denied' });
    }
  });

  socket.on('promote_wifi_user', (data) => {
    // data: { roomId, userId, targetId, role }
    const networkId = data.networkId || getNetworkId(socket);
    if (roleManager.canPerformAction(networkId, data.roomId, data.userId, 'promote')) {
      const updatedRoom = roomManager.updateRole(networkId, data.roomId, data.targetId, data.role);
      if (updatedRoom) {
        io.to(data.roomId).emit('wifi_room_role_updated', { 
          roomId: data.roomId, 
          targetId: data.targetId, 
          role: data.role,
          members: updatedRoom.members
        });

        // Emit system message
        const targetMember = updatedRoom.members.find(m => m.userId === data.targetId);
        io.to(data.roomId).emit('receive_message', {
          _id: `sys_${Date.now()}`,
          sender_id: 'system',
          recipient_id: data.roomId,
          content: `${targetMember?.username || 'A user'} was promoted to ${data.role}`,
          createdAt: new Date().toISOString(),
          type: 'system'
        });
      }
    } else {
      socket.emit('room_error', { message: 'Permission denied' });
    }
  });

  socket.on('rename_wifi_room', (data) => {
    const networkId = data.networkId || getNetworkId(socket);
    if (roleManager.canPerformAction(networkId, data.roomId, data.userId, 'rename')) {
        const updatedRoom = roomManager.renameRoom(networkId, data.roomId, data.newName);
        if (updatedRoom) {
            io.to(data.roomId).emit('wifi_room_renamed', { roomId: data.roomId, newName: data.newName });
            io.to(`wifi_${networkId}`).emit('wifi_room_updated', updatedRoom);
        }
    }
  });

  // --- Voice Call Signaling ---
  socket.on('call-user', (data) => {
    // data: { offer, to, from, callerName, callerAvatar }
    console.log(`Call offer from ${data.from} to ${data.to}`);
    io.to(data.to).emit('incoming-call', {
      offer: data.offer,
      from: data.from,
      callerName: data.callerName,
      callerAvatar: data.callerAvatar,
      type: data.type
    });
  });

  socket.on('make-answer', (data) => {
    // data: { answer, to }
    console.log(`Call answer to ${data.to}`);
    io.to(data.to).emit('call-answered', {
      answer: data.answer
    });
  });

  socket.on('ice-candidate', (data) => {
    // data: { candidate, to }
    io.to(data.to).emit('ice-candidate', {
      candidate: data.candidate
    });
  });

  socket.on('reject-call', (data) => {
    // data: { to }
    io.to(data.to).emit('call-rejected');
  });

  socket.on('end-call', (data) => {
    // data: { to }
    io.to(data.to).emit('call-ended');
  });

  socket.on('call-negotiation', (data) => {
    io.to(data.to).emit('call-negotiation', { offer: data.offer, from: data.from });
  });

  socket.on('call-negotiation-answer', (data) => {
    io.to(data.to).emit('call-negotiation-answer', { answer: data.answer });
  });
});

function startServer(port) {
  const serverInstance = server.listen(port);

  serverInstance.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is already in use. Trying port ${port + 1}...`);
      // Remove the listening listener from this attempt so it doesn't fire later
      serverInstance.removeAllListeners('listening');
      startServer(port + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });

  serverInstance.once('listening', () => {
    // Successfully listening, remove the error listener from this attempt
    serverInstance.removeAllListeners('error');
    console.log(`🚀 Server is running on port ${port}`);
  });
}

// Server is started in the mongoose.connect .then() block
