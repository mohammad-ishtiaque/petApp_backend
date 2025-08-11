const User = require('../User/User');
const Pet = require('../Pet/Pet');
const { ApiError } = require('../../../errors/errorHandler');
const bcrypt = require('bcrypt');
const Booking = require('../Booking/Booking');
const path = require('path');
const { deleteFile } = require('../../../utils/unLinkFiles');

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
    const userId = req.params.id;
    const { name, address, phone } = req.body;

    try {
        const user = await User.findById(userId).select('-password');
        if (!user) throw new ApiError('User not found', 404);

        // Handle profilePic update
        if (req.file) {
            // Delete old profile picture if it exists
            if (user.profilePic) {
                await deleteFile(path.join(__dirname, '..', '..', '..', user.profilePic));
            }
            // Update with new profile picture path (normalize path)
            user.profilePic = req.file.path.replace(/\\/g, '/');
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

exports.changePassword = async (req, res, next) => { // start of change password function
    try {
        const user = await User.findById(req.user.id).select('-password'); // get user from database
        // get old, new and confirm password from request body
        const { oldPassword, newPassword, confirmPassword } = req.body;
        if (!user) throw new ApiError('User not found', 404); // if user does not exist, throw error
        if (newPassword !== confirmPassword) throw new ApiError('Confirm password do not match', 400); // if new and confirm password do not match, throw error
        if (oldPassword === newPassword) throw new ApiError('New password cannot be the same as the old password', 400); // if new password is the same as old password, throw error
        const isMatch = await bcrypt.compare(oldPassword, user.password); // compare old password with stored password in database
        if (!isMatch) throw new ApiError('Invalid old password', 401); // if old password is invalid, throw error
        const salt = await bcrypt.genSalt(10);   
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword; // update user password
        await user.save(); // save user to database
        return res.status(200).json({ // return success message
            success: true,
            message: 'Password changed successfully'
        });
    } catch (err) {
        return next(err); // catch any error and pass it to next middleware
    }
};

exports.deleteAccount = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id); // get user from database
        if (!user) throw new ApiError('User not found', 404); // if user does not exist, throw error
        await user.deleteOne(); // delete user from database
        return res.status(200).json({ // return success message
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (err) {
        return next(err); // catch any error and pass it to next middleware
    }
};


exports.getMyAppointment = async(req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const booking = await Booking.find({ userId })
        return res.status(200).json({
            success: true,
            data: booking,
        });
    } catch (error) {
        return next(error)
    }
}

