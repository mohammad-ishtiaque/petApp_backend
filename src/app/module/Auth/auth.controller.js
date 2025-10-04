const User = require('../User/User');
const TempUser = require('../Temp/TempUser');
const bcrypt = require('bcrypt');
const emailService = require('../../../utils/emailService');
const tokenService = require('../../../utils/tokenService');
const { ApiError } = require('../../../errors/errorHandler');
const Owner = require('../Owner/Owner');
const Admin = require('../Admin/Admin');

exports.register = async (req, res, next) => {
  const { name, email, phone, password, confirmPassword, role } = req.body;

  try {
    // Check if password and confirm password match
    if (password !== confirmPassword) {
      throw new ApiError('Password and confirm password do not match', 400);
    }

    // Check if user already exists in main User collection
    const existingUser = await User.findOne({ email });
    const existingOwner = await Owner.findOne({ email });

    if (existingUser || existingOwner) {
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

    const roleUpper = role?.toUpperCase();
    if (!["USER", "OWNER"].includes(roleUpper)) {
      throw new ApiError('Invalid role', 400);
    }
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
      role: roleUpper
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
    const user = await User.findOne({ email }).select('+password');
    const owner = await Owner.findOne({ email }).select('+password');
    const admin = await Admin.findOne({ email }).select('+password');
    const superAdmin = await Admin.findOne({ email }).select('+password');
    // console.log(owner)

    if (!user && !owner && !admin && !superAdmin) throw new ApiError('User not found', 404);

    if (!user?.isVerified && !owner?.isVerified && !admin?.isVerified && !superAdmin?.isVerified) throw new ApiError('Email not verified', 403);

    // Check if user or owner exists
    const existingUser = user || owner || admin || superAdmin;
    if (!existingUser) throw new ApiError('User not found', 404);

    // Check if user password matches
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) throw new ApiError('Invalid email or password', 401);
    // Generate tokens
    const accessToken = tokenService.generateAccessToken({ id: existingUser._id, role: existingUser.role });
    const refreshToken = tokenService.generateRefreshToken({ id: existingUser._id, role: existingUser.role });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: { id: existingUser._id, name: existingUser.name, email: existingUser.email, role: existingUser.role }
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
    let user;
    if (tempUser.role === 'USER') {
      user = new User({ name, email, phone, password, isVerified: true });
    } else if (tempUser.role === 'OWNER') {
      user = new Owner({ name, email, phone, password, isVerified: true });
    }
    await user.save();
    await TempUser.deleteOne({ email });
    await emailService.sendWelcomeEmail(email, name, tempUser.role);

    // Auto-login: generate tokens
    const accessToken = tokenService.generateAccessToken({ id: user._id, role: tempUser.role });
    const refreshToken = tokenService.generateRefreshToken({ id: user._id, role: tempUser.role });

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
    const owner = await Owner.findOne({ email });
    const admin = await Admin.findOne({ email });
    if (!user && !owner && !admin) throw new ApiError('User not found', 404);
    const resetCode = tokenService.generateVerificationCode();
    if (user) user.passwordResetCode = { code: resetCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    if (owner) owner.passwordResetCode = { code: resetCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    if (admin) admin.passwordResetCode = { code: resetCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };

    if (user) await user.save();
    if (owner) await owner.save();
    if (admin) await admin.save();
    // Send password reset code
    await emailService.sendPasswordResetCode(email, resetCode);

    return res.status(200).json({
      success: true,
      message: 'Password reset code sent to your email.'
    });
  } catch (err) {
    return next(err);
  }
};


// RESEND PASSWORD RESET CODE
exports.resendPasswordResetCode = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    const owner = await Owner.findOne({ email });
    const admin = await Admin.findOne({ email });
    if (!user && !owner && !admin) throw new ApiError('User not found', 404);

    const resetCode = tokenService.generateVerificationCode();
    if (user) user.passwordResetCode = { code: resetCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    if (owner) owner.passwordResetCode = { code: resetCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    if (admin) admin.passwordResetCode = { code: resetCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };

    if (user) await user.save();
    if (owner) await owner.save();
    if (admin) await admin.save();

    // Send password reset code
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
  const { email, password, confirmPassword } = req.body;
  try {


    const user = await User.findOne({ email });
    const owner = await Owner.findOne({ email });
    const admin = await Admin.findOne({ email });
    if (!user && !owner && !admin) throw new ApiError('User not found', 404);
    if (password !== confirmPassword) throw new ApiError('Passwords do not match', 400);

    if (user) {
      // if (!user.passwordResetCode || user.passwordResetCode.code !== code || user.passwordResetCode.expiresAt < new Date()) {
      //   throw new ApiError('Invalid or expired reset code', 400);
      // }
      user.passwordResetCode = undefined;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user.password = hashedPassword;
      await user.save();
      return res.status(200).json({
        success: true,
        message: 'Password reset successful.'
      });
    }

    if (owner) {
      // if (!owner.passwordResetCode || owner.passwordResetCode.code !== code || owner.passwordResetCode.expiresAt < new Date()) {
      //   throw new ApiError('Invalid or expired reset code', 400);
      // }
      owner.passwordResetCode = undefined;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      owner.password = hashedPassword;
      await owner.save();
      return res.status(200).json({
        success: true,
        message: 'Password reset successful.'
      });
    }

    if (admin) {
      // if (!admin.passwordResetCode || admin.passwordResetCode.code !== code || admin.passwordResetCode.expiresAt < new Date()) {
      //   throw new ApiError('Invalid or expired reset code', 400);
      // }
      admin.passwordResetCode = undefined;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      admin.password = hashedPassword;
      await admin.save();
      return res.status(200).json({
        success: true,
        message: 'Password reset successful.'
      });
    }

  } catch (err) {
    return next(err);
  }
};

// VERIFY CODE (for generic code verification, e.g. resend/validate)
exports.verifyCode = async (req, res, next) => {
  const { email, code } = req.body;
  try {
    const user = await User.findOne({ email });
    const owner = await Owner.findOne({ email });
    const admin = await Admin.findOne({ email });
    if (!user && !owner && !admin) throw new ApiError('User not found', 404);

    const valid =
      user?.verificationCode?.code === code ||
      owner?.verificationCode?.code === code ||
      admin?.verificationCode?.code === code ||
      user?.passwordResetCode?.code === code ||
      owner?.passwordResetCode?.code === code ||
      admin?.passwordResetCode?.code === code;

    if (
      !valid ||
      (user?.passwordResetCode?.code === code && user?.passwordResetCode?.expiresAt < new Date()) ||
      (owner?.passwordResetCode?.code === code && owner?.passwordResetCode?.expiresAt < new Date()) ||
      (admin?.passwordResetCode?.code === code && admin?.passwordResetCode?.expiresAt < new Date())
    ) {
      throw new ApiError('Invalid or expired verification code', 400);
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code is valid.',
    });
  } catch (err) {
    return next(err);
  }
};


exports.resendVerificationCode = async (req, res, next) => {
  const { email } = req.body;
  try {
    let userOrOwner = await User.findOne({ email });
    if (!userOrOwner) userOrOwner = await Owner.findOne({ email });
    if (!userOrOwner) {
      const tempUser = await TempUser.findOne({ email });
      if (tempUser) {
        userOrOwner = tempUser;
      }
    }
    if (!userOrOwner) throw new ApiError('User not found', 404);
    const code = tokenService.generateVerificationCode();
    userOrOwner.verificationCode = { code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    await userOrOwner.save();
    await emailService.sendVerificationCode(email, code);
    return res.status(200).json({
      success: true,
      message: 'Verification code resent successfully.'
    });
  } catch (err) {
    return next(err);
  }
};

