const tokenService = require('../../utils/tokenService');
const { ApiError } = require('../../errors/errorHandler');
const asyncHandler = require('../../utils/asyncHandler');
const User = require('../module/User/user.model');
const Owner = require('../module/Owner/owner.model');

/**
 * Middleware to authenticate users and owners
 * @param {string[]} roles - Array of allowed roles (optional)
 * @returns {Function} - Express middleware
 */
const authenticate = (roles = []) => {
  return asyncHandler(async (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('Authorization token is required', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApiError('Invalid authorization format', 401);
    }

    // Verify token
    const decoded = tokenService.verifyAccessToken(token);
    if (!decoded) {
      throw new ApiError('Invalid token', 401);
    }

    // Find user or owner based on role
    let user;
    if (decoded.role === 'user') {
      user = await User.findById(decoded.id).select('-password');
    } else if (decoded.role === 'owner') {
      user = await Owner.findById(decoded.id).select('-password');
    } else if (decoded.role === 'admin') {
      // Admin handling would go here
      user = { _id: decoded.id, role: 'admin' };
    }

    if (!user) {
      throw new ApiError('User not found', 401);
    }

    // Check if user is verified
    if (user.isVerified === false) {
      throw new ApiError('Email not verified. Please verify your email to continue.', 403);
    }

    // Check if user has required role
    if (roles.length > 0 && !roles.includes(decoded.role)) {
      throw new ApiError('You do not have permission to access this resource', 403);
    }

    // Attach user to request object
    req.user = {
      id: user._id,
      email: user.email,
      role: decoded.role,
      ...(user.name && { name: user.name }),
      ...(user.businessName && { businessName: user.businessName })
    };

    next();
  });
};

/**
 * Middleware to check if user is verified
 */
const isVerified = asyncHandler(async (req, res, next) => {
  const { email, role } = req.body;
  
  if (!email || !role) {
    throw new ApiError('Email and role are required', 400);
  }

  let user;
  if (role === 'user') {
    user = await User.findOne({ email });
  } else if (role === 'owner') {
    user = await Owner.findOne({ email });
  }

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  if (!user.isVerified) {
    throw new ApiError('Email not verified. Please verify your email to continue.', 403);
  }

  next();
});

module.exports = {
  authenticate,
  isVerified
};
