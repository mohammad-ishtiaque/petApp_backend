const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
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
    required: true
  },
  profilePic: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN', 'OWNER'],
    default: 'OWNER'
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

  businesses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Business' }]
});

const Owner = mongoose.model('Owner', ownerSchema);

module.exports = Owner;
