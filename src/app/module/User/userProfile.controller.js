const User = require('../User/User');
const Pet = require('../Pet/Pet');
const { ApiError } = require('../../../errors/errorHandler');
const bcrypt = require('bcrypt');
const Booking = require('../Booking/Booking');
const path = require('path');
const { deleteFile } = require('../../../utils/unLinkFiles');
const Owner = require('../Owner/Owner');

exports.getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');  
        const pet = await Pet.find({ userId: req.user.id });
        if (!user) throw new ApiError('User not found', 404);
        return res.status(200).json({
            success: true,
            user,
            pet
        });
    } catch (err) {
        return next(err);
    }
};

exports.updateUserProfile = async (req, res, next) => {
    const userId = req.user.id;
    const { name, address, phone } = req.body;

    try {
        const user = await User.findById(userId).select('-password');
        if (!user) throw new ApiError('User not found', 404);

        // Handle profilePic update
        if (req.file) {
            // Delete old profile picture if it exists
            if (user.profilePic) {
                await deleteFile(user.profilePic);
            }
            // Update with new profile picture path (normalize path)
            user.profilePic = req.file.location;
        }

        user.name = name || user.name;
        user.address = address || user.address;
        user.phone = phone || user.phone;
        await user.save();
        return res.status(200).json({
            success: true,
            message: 'User profile updated successfully',
            user
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};



exports.getMyPets = async (req, res, next) => {

    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) throw new ApiError('User not found', 404);
        const pet = await Pet.find({ userId: req.user.id });
        return res.status(200).json({
            success: true,
            pet
        });
    } catch (err) {
        return next(err);
    }
};

//FAQ'S
//help center
//terms and conditions
//privacy policy
//change password
//delete account

exports.changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        const userId = req?.user?.id || req?.user?._id;
        // console.log(userId)

        // Try to find either User or Owner
        let account = null;
        account = await User.findById(userId) || await Owner.findById(userId);

        if (!account) throw new ApiError('Account not found', 404);

        if (newPassword !== confirmPassword)
            throw new ApiError('Confirm password does not match', 400);

        if (oldPassword === newPassword)
            throw new ApiError('New password cannot be the same as old password', 400);

        // Compare old password
        const isMatch = await bcrypt.compare(oldPassword, account.password);
        if (!isMatch) throw new ApiError('Invalid old password', 401);

        // Hash and update
        const salt = await bcrypt.genSalt(10);
        account.password = await bcrypt.hash(newPassword, salt);

        await account.save();

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (err) {
        return next(err);
    }
};

exports.deleteAccount = async (req, res, next) => {
    try {
        const userId = req?.user?.id || req?.user?._id;
        const { email, password } = req.body || {};

        if (!email || !password) {
            throw new ApiError('Email and password are required to delete account', 400);
        }

        // Find the authenticated account (could be User or Owner)
        let account = await User.findById(userId).select('+password');
        if (!account) {
            account = await Owner.findById(userId).select('+password');
        }

        if (!account) throw new ApiError('Account not found', 404);

        // Verify email matches the authenticated account
        const reqEmail = String(email).trim().toLowerCase();
        const accountEmail = String(account.email || '').trim().toLowerCase();
        if (reqEmail !== accountEmail) {
            throw new ApiError('Invalid credentials', 401);
        }

        // Verify password
        const valid = await bcrypt.compare(password, account.password);
        if (!valid) {
            throw new ApiError('Invalid credentials', 401);
        }

        await account.deleteOne();

        return res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });

    } catch (err) {
        return next(err);
    }
};



exports.getMyAppointment = async(req, res, next) => {
    try {
        const userId = req?.user?.id || req?.user?._id;
        const booking = await Booking.find({ userId })
        return res.status(200).json({
            success: true,
            data: booking,
        });
    } catch (error) {
        return next(error)
    }
}

