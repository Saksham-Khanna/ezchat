const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');

// Create a new group
router.post('/create', async (req, res) => {
  try {
    const { room_id, roomName, adminId, description, memberIds } = req.body;

    const existing = await Group.findOne({ room_id });
    if (existing) return res.status(400).json({ message: 'Group already exists' });

    const members = [{ userId: adminId, role: 'admin' }];
    if (Array.isArray(memberIds)) {
      memberIds.forEach(id => {
        if (id !== adminId && members.length < 10) {
          members.push({ userId: id, role: 'member' });
        }
      });
    }

    const newGroup = new Group({
      room_id,
      roomName,
      description,
      admin: adminId,
      members,
      capacity: 10
    });

    await newGroup.save();
    const populatedGroup = await newGroup.populate('members.userId', 'username avatar_url');
    res.status(201).json(populatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating group' });
  }
});


// Leave a group
router.post('/leave', async (req, res) => {
  try {
    const { room_id, userId } = req.body;
    const group = await Group.findOne({ room_id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    group.members = group.members.filter(m => m.userId.toString() !== userId);
    
    if (group.members.length === 0) {
      await Group.deleteOne({ _id: group._id });
      return res.json({ message: 'Group deleted as it has no members' });
    }

    // If admin leaves, promote someone else
    const wasAdmin = group.admin.toString() === userId;
    if (wasAdmin && group.members.length > 0) {
      group.admin = group.members[0].userId;
      group.members[0].role = 'admin';
    }

    await group.save();
    
    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      const populatedGroup = await Group.findById(group._id).populate('members.userId', 'username avatar_url');
      const formattedMembers = populatedGroup.members.map(m => ({
        userId: m.userId._id.toString(),
        username: m.userId.username,
        avatar_url: m.userId.avatar_url,
        role: m.role
      }));
      io.to(room_id).emit('wifi_room_user_left', { roomId: room_id, userId, members: formattedMembers });
      
      // Also emit a system message
      io.to(room_id).emit('receive_message', {
        _id: `sys_${Date.now()}`,
        sender_id: 'system',
        recipient_id: room_id,
        content: `A user has left the group`,
        createdAt: new Date().toISOString(),
        type: 'system'
      });
    }

    res.json({ message: 'Left group successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error leaving group' });
  }
});

// Get user's joined groups
router.get('/user/:userId', async (req, res) => {
  try {
    const groups = await Group.find({ 'members.userId': req.params.userId }).populate('members.userId', 'username avatar_url');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user groups' });
  }
});

// Get group history
router.get('/history/:room_id', async (req, res) => {
  try {
    const { decrypt } = require('../utils/encryption');
    const messages = await Message.find({ recipient_id: req.params.room_id }).sort({ createdAt: 1 });
    
    const processedMessages = messages.map(msg => {
      const msgObj = msg.toObject();
      if (msg.content && msg.content.startsWith('U2FsdGVkX1')) {
        try {
          const decrypted = decrypt(msg.content);
          if (decrypted && decrypted !== msg.content) {
            msgObj.content = decrypted;
          }
        } catch(e) {}
      }
      return msgObj;
    });

    res.json(processedMessages);
  } catch (err) {
    console.error('Group history error:', err);
    res.status(500).json({ message: 'Error fetching history' });
  }
});

// Invite members to group
router.post('/invite', async (req, res) => {
  try {
    const { room_id, memberIds } = req.body;
    const group = await Group.findOne({ room_id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!Array.isArray(memberIds)) return res.status(400).json({ message: 'Invalid memberIds' });

    let addedCount = 0;
    for (const id of memberIds) {
      if (group.members.length < group.capacity && !group.members.some(m => m.userId.toString() === id)) {
        group.members.push({ userId: id, role: 'member' });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await group.save();
    }

    const populatedGroup = await Group.findById(group._id).populate('members.userId', 'username avatar_url');
    
    // Notify added members via socket
    const io = req.app.get('io');
    if (io) {
      memberIds.forEach(id => {
        io.to(id.toString()).emit('group_invited', populatedGroup);
      });
    }

    res.json(populatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error inviting members' });
  }
});

// Rename group
router.post('/rename', async (req, res) => {
  try {
    const { room_id, userId, newName } = req.body;
    const group = await Group.findOne({ room_id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const member = group.members.find(m => m.userId.toString() === userId);
    if (!member || (member.role !== 'admin' && member.role !== 'manager')) {
      return res.status(403).json({ message: 'Only admins and managers can rename the group' });
    }

    group.roomName = newName;
    await group.save();
    
    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      io.to(room_id).emit('wifi_room_renamed', { roomId: room_id, newName });
    }

    const populatedGroup = await Group.findById(group._id).populate('members.userId', 'username avatar_url');
    res.json(populatedGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error renaming group' });
  }
});
// Remove group member
router.post('/remove', async (req, res) => {
  try {
    const { room_id, userId, targetId } = req.body;
    const group = await Group.findOne({ room_id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const member = group.members.find(m => m.userId.toString() === userId);
    if (!member || (member.role !== 'admin' && member.role !== 'manager')) {
      return res.status(403).json({ message: 'Only admins and managers can remove users' });
    }

    group.members = group.members.filter(m => m.userId.toString() !== targetId);
    await group.save();
    
    const io = req.app.get('io');
    if (io) {
      const populatedGroup = await Group.findById(group._id).populate('members.userId', 'username avatar_url');
      const formattedMembers = populatedGroup.members.map(m => ({
        userId: m.userId._id.toString(),
        username: m.userId.username,
        avatar_url: m.userId.avatar_url,
        role: m.role
      }));
      // Alert everyone still in the room that targetId was removed, along with the fresh new member list
      io.to(room_id).emit('wifi_room_user_removed', { roomId: room_id, targetId, members: formattedMembers });
      
      // Also manually kick out the target user's socket connection from the room so they stop receiving messages
      const clients = await io.in(room_id).fetchSockets();
      // Iterate via known client mapped sockets... 
      // Simplified: they will just be removed visually for everyone else.
    }

    res.json({ message: 'User removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error removing user' });
  }
});

// Promote group member
router.post('/promote', async (req, res) => {
  try {
    const { room_id, userId, targetId, role } = req.body;
    const group = await Group.findOne({ room_id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const member = group.members.find(m => m.userId.toString() === userId);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can change roles' });
    }

    const targetMember = group.members.find(m => m.userId.toString() === targetId);
    if (targetMember) {
      targetMember.role = role;
      await group.save();

      const io = req.app.get('io');
      if (io) {
        const populatedGroup = await Group.findById(group._id).populate('members.userId', 'username avatar_url');
        const formattedMembers = populatedGroup.members.map(m => ({
          userId: m.userId._id.toString(),
          username: m.userId.username,
          avatar_url: m.userId.avatar_url,
          role: m.role
        }));
        io.to(room_id).emit('wifi_room_role_updated', { roomId: room_id, targetId, role, members: formattedMembers });
      }
    }

    res.json({ message: 'User role updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating role' });
  }
});

// Delete group fully
router.post('/delete', async (req, res) => {
  try {
    const { room_id, userId } = req.body;
    const group = await Group.findOne({ room_id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const member = group.members.find(m => m.userId.toString() === userId);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete the group' });
    }

    await Group.deleteOne({ _id: group._id });
    
    const io = req.app.get('io');
    if (io) {
      io.to(room_id).emit('wifi_room_closed', { roomId: room_id });
      // Force all sockets to disconnect from the socket.io room
      io.in(room_id).socketsLeave(room_id);
    }
    
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting group' });
  }
});

module.exports = router;
