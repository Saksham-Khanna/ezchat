const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists with specific feedback
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email address is already registered' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        username, 
        email, 
        avatar_url: user.avatar_url, 
        bio: user.bio, 
        cv_id: user.cv_id,
        settings: user.settings
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Suggest Username
router.get('/suggest-username', async (req, res) => {
  try {
    const { current } = req.query;
    const adjectives = ['Swift', 'Neon', 'Vibe', 'Elite', 'Glass', 'Cloud', 'Pulse', 'Cyber', 'Frost', 'Echo'];
    const nouns = ['Pilot', 'Ghost', 'User', 'Spark', 'Flow', 'Nova', 'Bolt', 'Wave', 'Zen', 'X'];
    
    // Option 1: Similar to current input (if provided)
    let similarName = null;
    if (current && current.length >= 2) {
      let isTaken = true;
      let attempts = 0;
      while (isTaken && attempts < 5) {
        const num = Math.floor(Math.random() * 90) + 10;
        const candidate = `${current}${num}`;
        const existing = await User.findOne({ username: candidate });
        if (!existing) {
          similarName = candidate;
          isTaken = false;
        }
        attempts++;
      }
    }

    // Option 2: Completely random thematic name
    let randomName = '';
    let isTakenRandom = true;
    let attemptsRandom = 0;
    while (isTakenRandom && attemptsRandom < 10) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const num = Math.floor(Math.random() * 900) + 100;
      randomName = `${adj}${noun}${num}`;
      const existing = await User.findOne({ username: randomName });
      if (!existing) isTakenRandom = false;
      attemptsRandom++;
    }

    res.json({ 
      similar: similarName,
      random: randomName 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating username' });
  }
});

// Get Profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      bio: user.bio,
      cv_id: user.cv_id,
      settings: user.settings,
      is_online: user.is_online,
      is_pin_enabled: user.is_pin_enabled
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        email, 
        avatar_url: user.avatar_url, 
        bio: user.bio, 
        cv_id: user.cv_id,
        settings: user.settings
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// File upload configuration
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// Upload Avatar
router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete old avatar if exists
    if (user.avatar_url) {
      const oldPath = path.join(__dirname, '..', user.avatar_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.avatar_url = avatarUrl;
    await user.save();

    res.json({ message: 'Avatar uploaded', avatar_url: avatarUrl });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'Error uploading avatar' });
  }
});

// Update Profile
router.put('/update-profile', async (req, res) => {
  try {
    const { userId, username, bio, avatar_url } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check username uniqueness if changed
    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) return res.status(400).json({ message: 'Username already taken' });
      user.username = username;
    }

    if (bio !== undefined) user.bio = bio;
    if (avatar_url !== undefined) user.avatar_url = avatar_url;

    await user.save();

    // Notify all friends about the profile update via socket
    const io = req.app.get('io');
    if (io) {
      const fullUser = await User.findById(userId).populate('friends', '_id');
      if (fullUser && fullUser.friends) {
        fullUser.friends.forEach(friend => {
          io.to(friend._id.toString()).emit('profile_updated', {
            userId: userId,
            username: user.username,
            avatar_url: user.avatar_url,
            bio: user.bio,
          });
        });
      }
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        bio: user.bio,
        cv_id: user.cv_id,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// Send Friend Request
router.post('/send-request', async (req, res) => {
  try {
    const { userId, friendIdentifier } = req.body;
    const FriendRequest = require('../models/FriendRequest');

    const currentUser = await User.findById(userId);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    // Handle CV ID search flexible
    let searchId = friendIdentifier;
    if (searchId.length === 8 && !searchId.toLowerCase().startsWith('cv-')) {
      searchId = `CV-${searchId}`;
    }

    const friend = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${friendIdentifier}$`, "i") } },
        { cv_id: { $regex: new RegExp(`^${searchId}$`, "i") } }
      ]
    });

    if (!friend) return res.status(404).json({ message: 'User not found with that name or CV-ID' });
    
    if (friend._id.toString() === userId) {
      return res.status(400).json({ message: 'You cannot add yourself' });
    }

    // Check if currentUser is blocked by the target
    if (friend.blocked_users && friend.blocked_users.some(id => id.toString() === userId)) {
      return res.status(400).json({ message: 'User not found with that name or CV-ID' });
    }

    // Check if target is blocked by currentUser
    if (currentUser.blocked_users && currentUser.blocked_users.some(id => id.toString() === friend._id.toString())) {
      return res.status(400).json({ message: 'You have blocked this user. Unblock them first to add as a friend.' });
    }

    // Check if already friends
    if (currentUser.friends && currentUser.friends.some(f => f.toString() === friend._id.toString())) {
      return res.status(400).json({ message: 'User is already in your friends list' });
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: userId, receiver: friend._id },
        { sender: friend._id, receiver: userId }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ message: 'Friend request already sent' });
      }
      // Stale accepted/rejected record – delete it so a fresh request can be created
      await FriendRequest.findByIdAndDelete(existingRequest._id);
    }

    const newRequest = new FriendRequest({
      sender: userId,
      receiver: friend._id,
      status: 'pending'
    });

    await newRequest.save();
    
    // Notify via socket if possible
    const io = req.app.get('io');
    if (io) {
      const populatedRequest = await FriendRequest.findById(newRequest._id).populate('sender', 'username cv_id avatar_url');
      io.to(friend._id.toString()).emit('new_friend_request', populatedRequest);
    }

    res.json({ message: 'Friend request sent successfully' });

  } catch (error) {
    console.error("Send request error:", error);
    res.status(500).json({ message: 'Server error while sending request' });
  }
});

// Get Pending Requests
router.get('/requests/:userId', async (req, res) => {
  try {
    const FriendRequest = require('../models/FriendRequest');
    const requests = await FriendRequest.find({ 
      receiver: req.params.userId, 
      status: 'pending' 
    }).populate('sender', 'username cv_id avatar_url');
    
    res.json(requests);
  } catch (error) {
    console.error("Fetch requests error:", error);
    res.status(500).json({ message: 'Error fetching requests' });
  }
});

// Add Friend P2P (Immediate)
router.post('/add-friend-p2p', async (req, res) => {
  try {
    const { userId, targetId } = req.body;
    const user = await User.findById(userId);
    const target = await User.findById(targetId);

    if (!user || !target) return res.status(404).json({ message: 'User not found' });

    if (!user.friends.some(f => f.toString() === targetId)) user.friends.push(targetId);
    if (!target.friends.some(f => f.toString() === userId)) target.friends.push(userId);

    // Deduplicate
    user.friends = [...new Set(user.friends.map(f => f.toString()))];
    target.friends = [...new Set(target.friends.map(f => f.toString()))];

    await user.save();
    await target.save();

    // Clean up any friend requests between these two users
    const FriendRequest = require('../models/FriendRequest');
    await FriendRequest.deleteMany({
      $or: [
        { sender: userId, receiver: targetId },
        { sender: targetId, receiver: userId }
      ]
    });

    // Notify both via socket
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('friend_update', { action: 'added', friend: { _id: target._id, username: target.username, is_online: target.is_online, cv_id: target.cv_id, avatar_url: target.avatar_url } });
      io.to(targetId).emit('friend_update', { action: 'added', friend: { _id: user._id, username: user.username, is_online: user.is_online, cv_id: user.cv_id, avatar_url: user.avatar_url } });
    }

    res.json({ message: 'Friend added successfully', friend: target });
  } catch (error) {
    console.error("Add friend p2p error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Respond to Friend Request
router.post('/respond-request', async (req, res) => {
  try {
    const { requestId, status } = req.body; // status: 'accepted' or 'rejected'
    const FriendRequest = require('../models/FriendRequest');

    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (status === 'accepted') {
      const user1 = await User.findById(request.sender);
      const user2 = await User.findById(request.receiver);

      if (!user1.friends.some(f => f.toString() === user2._id.toString())) user1.friends.push(user2._id);
      if (!user2.friends.some(f => f.toString() === user1._id.toString())) user2.friends.push(user1._id);

      // Deduplicate friends arrays to clean up any prior duplicates
      user1.friends = [...new Set(user1.friends.map(f => f.toString()))];
      user2.friends = [...new Set(user2.friends.map(f => f.toString()))];

      await user1.save();
      await user2.save();
      
      request.status = 'accepted';
      await request.save();

      // Clean up any other mutual requests or duplicates
      await FriendRequest.deleteMany({
        _id: { $ne: requestId },
        $or: [
          { sender: request.sender, receiver: request.receiver },
          { sender: request.receiver, receiver: request.sender }
        ]
      });

      // Notify users via socket to update friends list
      const io = req.app.get('io');
      if (io) {
        io.to(user1._id.toString()).emit('friend_update', { action: 'added', friend: { _id: user2._id, username: user2.username, is_online: user2.is_online, cv_id: user2.cv_id, avatar_url: user2.avatar_url } });
        io.to(user2._id.toString()).emit('friend_update', { action: 'added', friend: { _id: user1._id, username: user1.username, is_online: user1.is_online, cv_id: user1.cv_id, avatar_url: user1.avatar_url } });
      }

      res.json({ message: 'Friend request accepted', friend: { _id: user1._id, username: user1.username, cv_id: user1.cv_id, avatar_url: user1.avatar_url } });
    } else {
      // For rejected, we can either update status or just delete the request
      await FriendRequest.findByIdAndDelete(requestId);
      res.json({ message: 'Friend request rejected' });
    }
  } catch (error) {
    console.error("Respond request error:", error);
    res.status(500).json({ message: 'Server error while responding to request' });
  }
});

// Unfriend User
router.post('/unfriend', async (req, res) => {
  try {
    const { userId, friendId } = req.body;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) return res.status(404).json({ message: 'User not found' });

    user.friends = user.friends.filter(f => f.toString() !== friendId);
    friend.friends = friend.friends.filter(f => f.toString() !== userId);

    await user.save();
    await friend.save();

    // Clean up any friend requests
    const FriendRequest = require('../models/FriendRequest');
    await FriendRequest.deleteMany({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId }
      ]
    });

    // Notify both users via socket
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('friend_update', { action: 'removed', friendId });
      io.to(friendId).emit('friend_update', { action: 'removed', friendId: userId });
    }

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error("Unfriend error:", error);
    res.status(500).json({ message: 'Server error while unfriending' });
  }
});

// Block User
router.post('/block', async (req, res) => {
  try {
    const { userId, targetId } = req.body;
    const FriendRequest = require('../models/FriendRequest');

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.blocked_users.some(id => id.toString() === targetId)) {
      user.blocked_users.push(targetId);
    }

    // Also unfriend them if they were friends
    user.friends = user.friends.filter(f => f.toString() !== targetId);
    const target = await User.findById(targetId);
    if (target) {
      target.friends = target.friends.filter(f => f.toString() !== userId);
      await target.save();
    }

    await user.save();

    // Clean up any friend requests between these two users
    await FriendRequest.deleteMany({
      $or: [
        { sender: userId, receiver: targetId },
        { sender: targetId, receiver: userId }
      ]
    });

    // Notify both users via socket
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('friend_update', { action: 'removed', friendId: targetId });
      io.to(targetId).emit('friend_update', { action: 'removed', friendId: userId });
    }

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error("Block error:", error);
    res.status(500).json({ message: 'Server error while blocking' });
  }
});

// Get Blocked Users
router.get('/blocked/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate('blocked_users', 'username email avatar_url bio');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json(user.blocked_users || []);
  } catch (error) {
    console.error("Fetch blocked users error:", error);
    res.status(500).json({ message: 'Error fetching blocked users' });
  }
});

// Unblock User
router.post('/unblock', async (req, res) => {
  try {
    const { userId, targetId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.blocked_users = user.blocked_users.filter(id => id.toString() !== targetId);

    // Re-add as friend on both sides
    if (!user.friends.some(f => f.toString() === targetId)) {
      user.friends.push(targetId);
    }
    await user.save();

    const target = await User.findById(targetId);
    if (target) {
      if (!target.friends.some(f => f.toString() === userId)) {
        target.friends.push(userId);
      }
      await target.save();

      // Notify both via socket so friends list updates in real time
      const io = req.app.get('io');
      if (io) {
        io.to(userId).emit('friend_update', { action: 'added', friend: { _id: target._id, username: target.username, is_online: target.is_online, cv_id: target.cv_id, avatar_url: target.avatar_url } });
        io.to(targetId).emit('friend_update', { action: 'added', friend: { _id: user._id, username: user.username, is_online: user.is_online, cv_id: user.cv_id, avatar_url: user.avatar_url } });
      }
    }

    res.json({ message: 'User unblocked and re-added as friend successfully' });
  } catch (error) {
    console.error("Unblock error:", error);
    res.status(500).json({ message: 'Server error while unblocking' });
  }
});

// Get Friends List with Unread Counts
router.get('/friends/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate('friends', 'username email avatar_url bio is_online cv_id');
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    // deduplicate friends list just in case
    const uniqueFriends = [];
    const seenIds = new Set();
    
    for (const friend of user.friends) {
      if (friend && !seenIds.has(friend._id.toString())) {
        uniqueFriends.push(friend);
        seenIds.add(friend._id.toString());
      }
    }

    const friendsListPromises = uniqueFriends.map(async (friend) => {
      const Message = require('../models/Message');
      const { decrypt } = require('../utils/encryption');
      
      const unreadCount = await Message.countDocuments({
        sender_id: friend._id,
        recipient_id: userId,
        status: { $ne: 'read' }
      });

      const lastMessage = await Message.findOne({
        $or: [
          { sender_id: friend._id, recipient_id: userId },
          { sender_id: userId, recipient_id: friend._id }
        ]
      }).sort({ createdAt: -1 });

      return {
        ...friend.toObject(),
        unread_count: unreadCount,
        last_message: lastMessage ? (lastMessage.content ? decrypt(lastMessage.content) : '') : '',
        last_message_time: lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
      };
    });
    
    // Resolve all promises
    const resolvedFriends = await Promise.all(friendsListPromises);
    res.json(resolvedFriends);
  } catch (error) {
    console.error("Fetch friends error:", error);
    res.status(500).json({ message: 'Error fetching friends' });
  }
});

// Update Settings
router.put('/settings', async (req, res) => {
  try {
    const { userId, settings } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.settings = { ...user.settings, ...settings };
    await user.save();
    res.json({ success: true, settings: user.settings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings' });
  }
});

// Set PIN
router.post('/set-pin', async (req, res) => {
  try {
    const { userId, pin } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Use bcrypt for PIN as well
    const salt = await bcrypt.genSalt(10);
    user.app_pin = await bcrypt.hash(pin, salt);
    user.is_pin_enabled = true;
    await user.save();
    
    res.json({ success: true, message: 'PIN set successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error setting PIN' });
  }
});

// Verify PIN
router.post('/verify-pin', async (req, res) => {
  try {
    const { userId, pin } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.app_pin) return res.status(400).json({ message: 'No PIN set' });

    const isMatch = await bcrypt.compare(pin, user.app_pin);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect PIN' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying PIN' });
  }
});

// Toggle PIN
router.post('/toggle-pin', async (req, res) => {
  try {
    const { userId, enabled } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.is_pin_enabled = enabled;
    await user.save();
    res.json({ success: true, enabled: user.is_pin_enabled });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling PIN' });
  }
});

// Change Password
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect old password' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating password' });
  }
});

// Delete Account
router.delete('/account/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndDelete(userId);
    const Message = require('../models/Message');
    await Message.deleteMany({ $or: [{ sender_id: userId }, { recipient_id: userId }] });
    // Also notify friends? (handled by disconnect usually, but good to clean up friends lists)
    await User.updateMany({ friends: userId }, { $pull: { friends: userId } });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account' });
  }
});

// Search Users
router.get('/search', async (req, res) => {
  try {
    const { query, userId } = req.query;
    if (!query) return res.json([]);

    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: userId },
      blocked_users: { $ne: userId }
    }).select('username avatar_url cv_id').limit(10);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

module.exports = router;
