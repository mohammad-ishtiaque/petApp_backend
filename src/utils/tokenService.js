const jwt = require('jsonwebtoken');
const { ApiError } = require('../errors/errorHandler');

/**
 * Service for handling JWT tokens
 */
class TokenService {
  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @param {string} expiresIn - Token expiration time (default: '1d')
   * @returns {string} - JWT token
   */
  generateAccessToken(payload, expiresIn = '1d') {
    if (!process.env.JWT_SECRET) {
      throw new ApiError('JWT_SECRET is not defined in environment variables', 500);
    }
    
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {string} - JWT token with longer expiration
   */
  generateRefreshToken(payload) {
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new ApiError('JWT_REFRESH_SECRET is not defined in environment variables', 500);
    }
    
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }

  /**
   * Verify access token
   * @param {string} token - JWT token to verify
   * @returns {Object} - Decoded token payload
   */
  verifyAccessToken(token) {
    if (!process.env.JWT_SECRET) {
      throw new ApiError('JWT_SECRET is not defined in environment variables', 500);
    }
    
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ApiError('Token has expired', 401);
      }
      throw new ApiError('Invalid token', 401);
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT refresh token to verify
   * @returns {Object} - Decoded token payload
   */
  verifyRefreshToken(token) {
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new ApiError('JWT_REFRESH_SECRET is not defined in environment variables', 500);
    }
    
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ApiError('Refresh token has expired, please login again', 401);
      }
      throw new ApiError('Invalid refresh token', 401);
    }
  }

  /**
   * Generate email verification token
   * @param {string} email - User email
   * @returns {string} - JWT token for email verification
   */
  generateEmailVerificationToken(email) {
    if (!process.env.JWT_SECRET) {
      throw new ApiError('JWT_SECRET is not defined in environment variables', 500);
    }
    
    return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '10m' });
  }

  /**
   * Generate password reset token
   * @param {string} email - User email
   * @returns {string} - JWT token for password reset
   */
  generatePasswordResetToken(email) {
    if (!process.env.JWT_SECRET) {
      throw new ApiError('JWT_SECRET is not defined in environment variables', 500);
    }
    
    return jwt.sign({ email, purpose: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '10m' });
  }

  /**
   * Generate a random verification code
   * @param {number} length - Length of the code (default: 6)
   * @returns {string} - Random numeric code
   */
  generateVerificationCode(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }
}

module.exports = new TokenService();
