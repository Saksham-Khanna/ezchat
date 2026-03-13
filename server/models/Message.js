const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender_id: {
    type: String, // String to handle both User ID and potential future system/room IDs
    required: true,
  },
  recipient_id: {
    type: String, // String to handle both User ID and Room ID
    required: true,
  },
  sender_name: {
    type: String, // Useful for groups
  },
  sender_avatar: {
    type: String, // Useful for groups
  },
  content: {
    type: String, // This will store the encrypted string
  },
  is_encrypted: {
    type: Boolean,
    default: true,
  },
  media_url: {
    type: String,
    default: '',
  },
  media_type: {
    type: String, 
    enum: ['image', 'video', 'audio', 'document', 'none', 'call', 'call_video'],
    default: 'none',
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  is_deleted: {
    type: Boolean,
    default: false,
  },
  is_edited: {
    type: Boolean,
    default: false,
  },
  reply_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  reactions: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String }
  }],
  is_forwarded: {
    type: Boolean,
    default: false,
  },
  deleted_for: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  is_disappearing: {
    type: Boolean,
    default: false,
  },
  disappearing_duration: {
    type: Number, // duration in seconds
    default: 0,
  },
  expires_at: {
    type: Date, // For server-side TTL if needed
  },
  call_duration: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

// TTL index for disappearing messages
messageSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);
