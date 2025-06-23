const nodemailer = require('nodemailer');
const { ApiError } = require('../errors/errorHandler');

/**
 * Email service for sending verification codes, password reset links, etc.
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
    }
    });
  }

  /**
   * Send verification code email
   * @param {string} to - Recipient email
   * @param {string} code - Verification code
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationCode(to, code) {
    try {
      const mailOptions = {
        from: `"Pet Apps" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject: 'Email Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #4CAF50;">Verify Your Email</h2>
            <p>Thank you for registering with Pet Apps. Please use the following code to verify your email address:</p>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <p>Best regards,<br>The Pet Apps Team</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new ApiError('Failed to send verification email', 500);
    }
  }

  /**
   * Send password reset email
   * @param {string} to - Recipient email
   * @param {string} code - Reset code
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetCode(to, code) {
    try {
      const mailOptions = {
        from: `"Pet Apps" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject: 'Password Reset Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #2196F3;">Reset Your Password</h2>
            <p>We received a request to reset your password. Please use the following code to reset your password:</p>
            <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
            <p>Best regards,<br>The Pet Apps Team</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new ApiError('Failed to send password reset email', 500);
    }
  }

  /**
   * Send welcome email after successful registration
   * @param {string} to - Recipient email
   * @param {string} name - User's name
   * @param {string} role - User's role (user or owner)
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(to, name, role) {
    try {
      const roleSpecificText = role === 'owner' 
        ? 'Thank you for registering your business with Pet Apps. We\'re excited to have you as a service provider!'
        : 'Thank you for joining Pet Apps. We\'re excited to help you connect with pet services!';

      const mailOptions = {
        from: `"Pet Apps" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject: 'Welcome to Pet Apps!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #4CAF50;">Welcome to Pet Apps!</h2>
            <p>Hello ${name},</p>
            <p>${roleSpecificText}</p>
            <p>You can now log in to your account and start using our services.</p>
            <p>Best regards,<br>The Pet Apps Team</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw an error for welcome emails as they're not critical
      return false;
    }
  }
}

module.exports = new EmailService();
