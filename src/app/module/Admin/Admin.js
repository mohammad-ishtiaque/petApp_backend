const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    unique: true, 
    required: true, 
    trim: true
    },
  password: {   
    type: String,
    required: true
  },
  phone: {
    type: String,
  },
  profilePic: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['ADMIN', 'SUPER_ADMIN'],
    default: 'ADMIN'
  },
  verficationToken: {
    code: String,
    expiresAt: Date
  },
  passwordResetCode: {
    code: String,
    expiresAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
});

module.exports = mongoose.model('Admin', adminSchema);


