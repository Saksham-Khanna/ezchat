const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/encryption');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Chat media upload config
const mediaDir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, mediaDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `chat_${Date.now()}${ext}`);
  }
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// Upload Chat Media
router.post('/upload-media', mediaUpload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const mediaUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ media_url: mediaUrl });
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({ message: 'Error uploading media' });
  }
});

// Audio upload config
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, mediaDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `audio_${Date.now()}${ext}`);
  }
});

const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only audio files are allowed'));
  }
});

// Upload Voice Note
router.post('/upload-audio', audioUpload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const mediaUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ media_url: mediaUrl });
  } catch (error) {
    console.error('Upload audio error:', error);
    res.status(500).json({ message: 'Error uploading audio' });
  }
});

// Document upload config
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, mediaDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `doc_${Date.now()}_${baseName}${ext}`);
  }
});

const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only document files (PDF, Word, Excel, TXT) are allowed'));
  }
});

// Upload Document
router.post('/upload-doc', docUpload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const mediaUrl = `/uploads/chat/${req.file.filename}`;
    res.json({
      media_url: mediaUrl,
      original_name: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Error uploading document' });
  }
});

// Video upload config
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, mediaDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `video_${Date.now()}${ext}`);
  }
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only video files (MP4, WEBM, MOV) are allowed'));
  }
});

// Upload Video
router.post('/upload-video', videoUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const mediaUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ media_url: mediaUrl });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ message: 'Error uploading video' });
  }
});

// Send Message
router.post('/send', async (req, res) => {
  try {
    const { sender_id, recipient_id, content, media_url, media_type, reply_to, call_duration, sender_name } = req.body;
    
    // Encrypt content before saving
    const encryptedContent = encrypt(content || "");

    // Skip recipient check for rooms
    if (!recipient_id.startsWith('room_')) {
      const recipient = await User.findById(recipient_id);
      if (!recipient) return res.status(404).json({ message: 'Recipient not found' });
    }

    const newMessage = new Message({
      sender_id,
      recipient_id,
      sender_name,
      content: encryptedContent,
      media_url: media_url || '',
      media_type,
      reply_to: reply_to || null,
      call_duration: call_duration || 0,
    });

    await newMessage.save();
    
    // If it's a reply, populate it before returning
    let responseData = newMessage.toObject();
    if (reply_to) {
      const parentMsg = await Message.findById(reply_to);
      if (parentMsg) {
        const { decrypt } = require('../utils/encryption');
        try {
          responseData.reply_to = {
            _id: parentMsg._id,
            content: decrypt(parentMsg.content),
            sender_id: parentMsg.sender_id,
          };
        } catch(e) {}
      }
    }

    responseData.content = content; // Return plain text for UI and Socket
    res.status(201).json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Get Messages between two users
router.get('/history/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const isRoom = user2.startsWith('room_');
    
    const query = isRoom 
      ? { recipient_id: user2 }
      : {
          $or: [
            { sender_id: user1, recipient_id: user2 },
            { sender_id: user2, recipient_id: user1 }
          ]
        };

    const messages = await Message.find(query)
    .populate({
      path: 'reply_to',
      select: 'content sender_id'
    })
    .sort({ createdAt: 1 });

    // Decrypt messages before sending to client, filter out deleted_for and is_deleted
    const decryptedMessages = messages
      .filter(msg => !msg.is_deleted && !msg.deleted_for.some(id => id.toString() === user1))
      .map(msg => {
        const msgObj = msg.toObject();
        try {
          msgObj.content = decrypt(msg.content);
        } catch (e) {
          console.error("Decryption failed for message", msg._id);
        }

        // Decrypt reply if present
        if (msgObj.reply_to && msgObj.reply_to.content) {
          try {
            msgObj.reply_to.content = decrypt(msgObj.reply_to.content);
          } catch(e) {}
        }

        return msgObj;
      });

    res.json(decryptedMessages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching chat history' });
  }
});

// Mark messages as read
router.post('/read', async (req, res) => {
  try {
    const { userId, friendId } = req.body;
    await Message.updateMany(
      { sender_id: friendId, recipient_id: userId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ message: 'Error marking messages as read' });
  }
});

// Delete a message for everyone
router.delete('/:id', async (req, res) => {
  try {
    const { sender_id } = req.query;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender_id.toString() !== sender_id) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    // Delete media file from disk if it exists
    if (message.media_url) {
      const filePath = path.join(__dirname, '..', message.media_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    message.is_deleted = true;
    message.content = '';
    message.media_url = '';
    message.media_type = 'none';
    await message.save();

    // Emit socket event to both users
    const io = req.app.get('io');
    const deletePayload = {
      messageId: message._id.toString(),
      sender_id: message.sender_id.toString(),
      recipient_id: message.recipient_id.toString(),
    };
    io.to(message.sender_id.toString()).emit('message_deleted', deletePayload);
    io.to(message.recipient_id.toString()).emit('message_deleted', deletePayload);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Error deleting message' });
  }
});

// Delete a message for me only
router.post('/delete-for-me/:id', async (req, res) => {
  try {
    const { user_id } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Verify the user is part of this conversation
    const isSender = message.sender_id.toString() === user_id;
    const isRecipient = message.recipient_id.toString() === user_id;
    if (!isSender && !isRecipient) {
      return res.status(403).json({ message: 'You are not part of this conversation' });
    }

    // Add user to deleted_for if not already there
    if (!message.deleted_for.some(id => id.toString() === user_id)) {
      message.deleted_for.push(user_id);
      await message.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete for me error:', error);
    res.status(500).json({ message: 'Error deleting message' });
  }
});

// Edit Message
router.put('/:id', async (req, res) => {
  try {
    const { content, sender_id } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender_id.toString() !== sender_id) return res.status(403).json({ message: 'Unauthorized' });

    message.content = encrypt(content);
    message.is_edited = true;
    await message.save();

    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ message: 'Error editing message' });
  }
});

// React to Message
router.post('/react/:id', async (req, res) => {
  try {
    const { user_id, emoji } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const existingIndex = message.reactions.findIndex(r => r.user_id.toString() === user_id);
    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1); // Remove if same emoji
      } else {
        message.reactions[existingIndex].emoji = emoji; // Update if different
      }
    } else {
      message.reactions.push({ user_id, emoji });
    }

    await message.save();
    res.json(message.reactions);
  } catch (error) {
    res.status(500).json({ message: 'Error reacting to message' });
  }
});

// Clear Chat (delete all messages between two users for one user)
router.post('/clear-chat', async (req, res) => {
  try {
    const { userId, friendId } = req.body;
    
    // Add userId to deleted_for array on all messages between these two users
    await Message.updateMany(
      {
        $or: [
          { sender_id: userId, recipient_id: friendId },
          { sender_id: friendId, recipient_id: userId }
        ]
      },
      { $addToSet: { deleted_for: userId } }
    );

    res.json({ success: true, message: 'Chat cleared successfully' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ message: 'Error clearing chat' });
  }
});

module.exports = router;
