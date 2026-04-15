const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const dns = require('dns');

// Fix for MongoDB connection issues (ECONNREFUSED)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
require('dotenv').config();

const app = express();
const PORT = parseInt(process.env.PORT || 5001, 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

const User = require('./models/User');
const Group = require('./models/Group');

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    
    // Reset all users to offline on server startup to prevent stale 'online' status
    try {
      const resetResult = await User.updateMany({}, { is_online: false });
      console.log(`Presence Reset: Marked ${resetResult.modifiedCount} users as offline.`);
    } catch (err) {
      console.error('Error during startup presence reset:', err);
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
const aiRoutes = require('./routes/ai');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/ai', aiRoutes);

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
  return 'local';
};

io.on('connection', (socket) => {
  // Connection logged without exposing socket ID

  socket.on('heartbeat', async (userId) => {
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, { last_seen: new Date() });
      } catch (err) {
        console.error('Heartbeat update error:', err);
      }
    }
  });

  socket.on('join', async (userId) => {
    if (userId) {
      socket.join(userId.toString());
      userSocketMap.set(socket.id, userId.toString());
      // User joined their room

      // Mark user as online in DB
      try {
        // Explicitly update is_online AND last_seen (heartbeat)
        const user = await User.findByIdAndUpdate(userId, { 
          is_online: true,
          last_seen: new Date()
        }, { returnDocument: 'after' })
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
    
    // Message relayed (content not logged for privacy)
    
    if (recipient_id) {
      // Ensure we emit stringified IDs
      const emitData = { ...data, sender_id, recipient_id };
      io.to(recipient_id).emit('receive_message', emitData);
    } else {
      console.error('send_message failed: recipient_id is missing');
    }
  });

  socket.on('typing', (data) => {
    // data: { sender_id, recipient_id, is_typing, username, avatar_url }
    const recipient_id = data.recipient_id?.toString();
    if (recipient_id) {
      io.to(recipient_id).emit('user_typing', {
        userId: data.sender_id?.toString(),
        recipientId: recipient_id,
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
    // User disconnected

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
        try {
          const user = await User.findByIdAndUpdate(userId, { 
            is_online: false,
            last_seen: new Date() 
          }, { returnDocument: 'after' })
            .populate('friends', '_id');
          
          if (user && user.friends) {
            // Self-correction: The change stream below will handle global broadcasts
            // but we still emit here for low-latency on the SAME server
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
      }
    }
  });

  // --- Real-time Status Sync via MongoDB Change Streams ---
  // This allows multiple server instances (local + prod) to sync online status
  // even if they don't share a socket network.
  try {
    const userChangeStream = User.watch([], { fullDocument: 'updateLookup' });
    userChangeStream.on('change', async (change) => {
      if (change.operationType === 'update') {
        const fields = change.updateDescription.updatedFields;
        // Trigger on any status or heartbeat change
        if (fields.is_online !== undefined || fields.last_seen !== undefined) {
          const userId = change.documentKey._id.toString();
          const isOnline = change.fullDocument.is_online;
          const lastSeen = change.fullDocument.last_seen;
          
          // Broadcast globally so all server instances can tell their local clients
          // The frontend will filter this and only update if the user is a friend
          io.emit('friend_status', {
            userId: userId,
            is_online: isOnline,
            last_seen: lastSeen
          });
        }
      }
    });

    // --- Heartbeat Cleanup ---
    // Periodically checks for users marked 'online' who haven't sent a heartbeat/join in 5 minutes.
    setInterval(async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      try {
        const staleUsers = await User.find({ 
          is_online: true, 
          last_seen: { $lt: fiveMinutesAgo } 
        });

        if (staleUsers.length > 0) {
          console.log(`Heartbeat Cleanup: Found ${staleUsers.length} stale sessions.`);
          for (const user of staleUsers) {
            await User.findByIdAndUpdate(user._id, { is_online: false });
            io.emit('friend_status', {
              userId: user._id.toString(),
              is_online: false,
              last_seen: user.last_seen
            });
            console.log(`User ${user.username} (${user._id}) marked offline due to inactivity.`);
          }
        }
      } catch (err) {
        console.error('Heartbeat cleanup error:', err);
      }
    }, 60 * 1000); // Run every minute

    console.log('User status Change Stream and Heartbeat active.');
  } catch (err) {
    console.warn('MongoDB Change Stream failed (likely non-replica set):', err.message);
  }

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
    const to = data.to?.toString();
    console.log(`Call offer from ${data.from} to ${to} (type: ${data.type})`);
    if (to) {
      io.to(to).emit('incoming-call', {
        offer: data.offer,
        from: data.from?.toString(),
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        type: data.type
      });
    }
  });

  socket.on('make-answer', (data) => {
    const to = data.to?.toString();
    console.log(`Call answer from ${socket.id} to ${to}`);
    if (to) {
      io.to(to).emit('call-answered', {
        answer: data.answer
      });
    }
  });

  socket.on('ice-candidate', (data) => {
    const to = data.to?.toString();
    if (to) {
      io.to(to).emit('ice-candidate', {
        candidate: data.candidate
      });
    }
  });

  socket.on('reject-call', (data) => {
    const to = data.to?.toString();
    if (to) io.to(to).emit('call-rejected');
  });

  socket.on('end-call', (data) => {
    const to = data.to?.toString();
    if (to) io.to(to).emit('call-ended');
  });

  socket.on('call-negotiation', (data) => {
    const to = data.to?.toString();
    if (to) io.to(to).emit('call-negotiation', { offer: data.offer, from: data.from });
  });

  socket.on('call-negotiation-answer', (data) => {
    const to = data.to?.toString();
    if (to) io.to(to).emit('call-negotiation-answer', { answer: data.answer });
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

// Catch-all to serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Server is started in the mongoose.connect .then() block
