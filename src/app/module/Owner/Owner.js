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
    // required: true
  },
  address: {
    type: String
  },
  profilePic: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isBlocked: {
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
  verificationCode: {
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
  bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
  businesses: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  subscription: {
    isActive: {
      type: Boolean,
      default: false
    },
    planIdentifier: {
      type: String
    },
    expirationDate: {
      type: Date
    },
    originalTransactionId: {
      type: String
    },
    store: {
      type: String,
      enum: ['APP_STORE', 'PLAY_STORE', 'STRIPE', 'PROMOTIONAL']
    }
  }
});

module.exports = mongoose.model('Owner', ownerSchema);


