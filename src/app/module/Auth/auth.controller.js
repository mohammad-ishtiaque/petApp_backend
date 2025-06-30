const User = require('../User/User');
const TempUser = require('../Temp/TempUser');
const bcrypt = require('bcrypt');
const emailService = require('../../../utils/emailService');
const tokenService = require('../../../utils/tokenService');
const { ApiError } = require('../../../errors/errorHandler');

exports.register = async (req, res, next) => {
    const { name, email, phone, password, confirmPassword } = req.body;

    try {
        // Check if password and confirm password match
        if (password !== confirmPassword) {
            throw new ApiError('Password and confirm password do not match', 400);
        }

        // Check if user already exists in main User collection
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new ApiError('User already exists', 409);
        }

        // Check if there's a pending verification in TempUser
        let tempUser = await TempUser.findOne({ email });
        if (tempUser) {
            await TempUser.findOneAndDelete({ email });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification code using tokenService
        const verificationCode = tokenService.generateVerificationCode();

        // Create temporary user
        tempUser = new TempUser({
            name,
            email,
            phone,
            password: hashedPassword,
            verificationCode: {
                code: verificationCode,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
            },
            role: 'USER'
        });

        await tempUser.save();

        // Send verification email
        try {
            await emailService.sendVerificationCode(email, verificationCode);
            return res.status(201).json({
                success: true,
                message: 'Please verify your email to complete registration',
                email
            });
        } catch (emailError) {
            await TempUser.findOneAndDelete({ email });
            return next(new ApiError('Failed to send verification email', 500));
        }
    } catch (err) {
        return next(err);
    }
};

// LOGIN
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    // console.log(user);

    if (!user) throw new ApiError('User not found', 404);
    
    if (!user?.isVerified) throw new ApiError('Email not verified', 403);
    

    const isMatch = await bcrypt.compare(password, user.password);
    // console.log(password, user.password);
    // console.log(isMatch);
    
    if (!isMatch) throw new ApiError('Invalid email or password', 401);
    // Generate tokens
    const accessToken = tokenService.generateAccessToken({ id: user._id, role: 'USER' });
    const refreshToken = tokenService.generateRefreshToken({ id: user._id, role: 'USER' });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    return next(err);
  }
};

// EMAIL VERIFICATION
exports.verifyEmail = async (req, res, next) => {
  const { email, code } = req.body;
  try {
    const tempUser = await TempUser.findOne({ email });
    if (!tempUser) throw new ApiError('No pending verification for this email', 404);
    if (!tempUser.verificationCode || tempUser.verificationCode.code !== code || tempUser.verificationCode.expiresAt < new Date()) {
      throw new ApiError('Invalid or expired verification code', 400);
    }
    // Move user from TempUser to User
    const { name, phone, password } = tempUser;
    const user = new User({ name, email, phone, password, isVerified: true, role: 'USER' });
    await user.save();
    await TempUser.deleteOne({ email });
    await emailService.sendWelcomeEmail(email, name, 'user');

    // Auto-login: generate tokens
    const accessToken = tokenService.generateAccessToken({ id: user._id, role: 'USER' });
    const refreshToken = tokenService.generateRefreshToken({ id: user._id, role: 'USER' });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You are now logged in.',
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    return next(err);
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) throw new ApiError('User not found', 404);
    const resetCode = tokenService.generateVerificationCode();
    user.setPasswordResetCode(resetCode);
    await user.save();
    await emailService.sendPasswordResetCode(email, resetCode);
    return res.status(200).json({
      success: true,
      message: 'Password reset code sent to your email.'
    });
  } catch (err) {
    return next(err);
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res, next) => {
  const { email, code, password, confirmPassword } = req.body;
  try {
    if (password !== confirmPassword) throw new ApiError('Passwords do not match', 400);
    const user = await User.findOne({ email });
    if (!user) throw new ApiError('User not found', 404);
    if (!user.verifyPasswordResetCode(code)) throw new ApiError('Invalid or expired reset code', 400);
    // user.password = password;
    user.passwordResetCode = undefined;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user.password = hashedPassword;

    await user.save();
    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in.'
    });
  } catch (err) {
    return next(err);
  }
};

// VERIFY CODE (for generic code verification, e.g. resend/validate)
exports.verifyCode = async (req, res, next) => {
  const { email, code, type } = req.body; // type: 'verification' or 'reset'
  try {
    const user = await User.findOne({ email });
    if (!user) throw new ApiError('User not found', 404);
    let valid = false;
    if (type === 'verification') {
      valid = user.verifyCode(code);
    } else if (type === 'reset') {
      valid = user.verifyPasswordResetCode(code);
    }
    if (!valid) throw new ApiError('Invalid or expired code', 400);
    return res.status(200).json({
      success: true,
      message: 'Code is valid.'
    });
  } catch (err) {
    return next(err);
  }
};


