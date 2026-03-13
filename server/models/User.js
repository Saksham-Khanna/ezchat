const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar_url: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
    maxlength: 150,
  },
  is_online: {
    type: Boolean,
    default: false,
  },
  last_seen: {
    type: Date,
    default: Date.now,
  },
  settings: {
    theme: { type: String, default: 'dark' },
    show_read_receipts: { type: Boolean, default: true },
    notifications_enabled: { type: Boolean, default: true },
    sounds_enabled: { type: Boolean, default: true },
  },
  app_pin: {
    type: String,
    default: null,
  },
  is_pin_enabled: {
    type: Boolean,
    default: false,
  },
  cv_id: {
    type: String,
    unique: true,
    sparse: true,
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  blocked_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
}, { timestamps: true });

// Generate unique CV ID and hash password
userSchema.pre('save', async function() {
  // Generate CV ID if new
  if (this.isNew && !this.cv_id) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    this.cv_id = `CV-${result}`;
  }

  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
