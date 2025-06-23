const Joi = require('joi');
const { ApiError } = require('../../errors/errorHandler');

/**
 * Middleware for request validation using Joi
 * @param {Object} schema - Joi validation schema
 * @returns {Function} - Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new ApiError(errorMessage, 400));
    }

    next();
  };
};

// Validation schemas
const schemas = {
  // User registration schema
  userRegister: Joi.object({
    name: Joi.string().required().min(2).max(50),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(8).max(30)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
    phone: Joi.string().pattern(new RegExp('^[0-9]{10,15}$')).required()
  }),

  // Owner registration schema
  ownerRegister: Joi.object({
    name: Joi.string().required().min(2).max(50),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(8).max(30)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
    phone: Joi.string().pattern(new RegExp('^[0-9]{10,15}$')).required(),
    businessName: Joi.string().required().min(2).max(100),
    businessType: Joi.string().required().valid('vet', 'trainer', 'groomer', 'hotel', 'shop', 'friendly-place'),
    address: Joi.string().required().min(5).max(200),
    website: Joi.string().uri().allow('').optional()
  }),

  // Login schema
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    role: Joi.string().valid('user', 'owner', 'admin').required()
  }),

  // Email verification schema
  verifyEmail: Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().required().length(6).pattern(/^[0-9]+$/),
    role: Joi.string().valid('user', 'owner').required()
  }),

  // Resend verification code schema
  resendVerificationCode: Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid('user', 'owner').required()
  }),

  // Forgot password schema
  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid('user', 'owner', 'admin').required()
  }),

  // Reset password schema
  resetPassword: Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().required().length(6).pattern(/^[0-9]+$/),
    password: Joi.string().required().min(8).max(30)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
    role: Joi.string().valid('user', 'owner', 'admin').required()
  }),

  // Change password schema
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().required().min(8).max(30)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({ 'any.only': 'Passwords do not match' })
  }),

  // Refresh token schema
  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),

  // Pet schema (for user)
  addPet: Joi.object({
    name: Joi.string().required().min(1).max(50),
    type: Joi.string().required(),
    breed: Joi.string().required(),
    age: Joi.number().integer().min(0).required(),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    weight: Joi.number().positive().required(),
    height: Joi.number().positive().required(),
    color: Joi.string().required(),
    description: Joi.string().allow('').optional(),
    medicalHistory: Joi.string().allow('').optional(),
    photo: Joi.string().allow('').optional()
  })
};

module.exports = {
  validate,
  schemas
};
