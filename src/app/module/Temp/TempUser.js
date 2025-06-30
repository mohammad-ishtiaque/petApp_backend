const mongoose = require('mongoose');

const tempUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    code: String,
    expiresAt: Date
  },
  passwordResetCode: {
    code: String,
    expiresAt: Date
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN', 'OWNER'],
    default: 'USER'
  },
  pets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});



const TempUser = mongoose.model('TempUser', tempUserSchema);

module.exports = TempUser;
