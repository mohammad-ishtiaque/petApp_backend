const tokenService = require('../../utils/tokenService');
const { ApiError } = require('../../errors/errorHandler');
const asyncHandler = require('../../utils/asyncHandler');
const User = require('.././module/User/User');
// const Owner = require('../module/Owner/owner.model');

/**
 * Middleware to authenticate users only
 */
const authenticateUser = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError('Authorization token is required', 401);
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new ApiError('Invalid authorization format', 401);
  }
  const decoded = tokenService.verifyAccessToken(token);
  if (!decoded || decoded.role !== 'user') {
    throw new ApiError('Invalid or unauthorized token', 401);
  }
  const user = await User.findById(decoded.id).select('-password');
  if (!user) {
    throw new ApiError('User not found', 401);
  }
  if (user.isVerified === false) {
    throw new ApiError('Email not verified. Please verify your email to continue.', 403);
  }
  req.user = {
    id: user._id,
    email: user.email,
    role: decoded.role,
    ...(user.name && { name: user.name })
  };
  next();
});

/**
 * Middleware to authenticate owners only
 */
// const authenticateOwner = asyncHandler(async (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     throw new ApiError('Authorization token is required', 401);
//   }
//   const token = authHeader.split(' ')[1];
//   if (!token) {
//     throw new ApiError('Invalid authorization format', 401);
//   }
//   const decoded = tokenService.verifyAccessToken(token);
//   if (!decoded || decoded.role !== 'owner') {
//     throw new ApiError('Invalid or unauthorized token', 401);
//   }
//   const owner = await Owner.findById(decoded.id).select('-password');
//   if (!owner) {
//     throw new ApiError('Owner not found', 401);
//   }
//   if (owner.isVerified === false) {
//     throw new ApiError('Email not verified. Please verify your email to continue.', 403);
//   }
//   req.owner = {
//     id: owner._id,
//     email: owner.email,
//     role: decoded.role,
//     ...(owner.name && { name: owner.name }),
//     ...(owner.businessName && { businessName: owner.businessName })
//   };
//   next();
// });

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
  authenticateUser,
  // authenticateOwner,
  isVerified
};
