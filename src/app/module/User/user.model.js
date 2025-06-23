const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to set verification code
userSchema.methods.setVerificationCode = function(code) {
  this.verificationCode = {
    code,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  };
};

// Method to verify code
userSchema.methods.verifyCode = function(code) {
  return (
    this.verificationCode &&
    this.verificationCode.code === code &&
    this.verificationCode.expiresAt > new Date()
  );
};

// Method to set password reset code
userSchema.methods.setPasswordResetCode = function(code) {
  this.passwordResetCode = {
    code,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  };
};

// Method to verify password reset code
userSchema.methods.verifyPasswordResetCode = function(code) {
  return (
    this.passwordResetCode &&
    this.passwordResetCode.code === code &&
    this.passwordResetCode.expiresAt > new Date()
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
