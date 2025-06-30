const User = require('../User/User');
const Pet = require('../Pet/Pet');
const { ApiError } = require('../../../errors/errorHandler');
const bcrypt = require('bcrypt');


exports.getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const pet = await Pet.find({ userId: req.user.id });
        console.log(pet);
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
    try {
        const user = await User.findById(req.user.id);
        if (!user) throw new ApiError('User not found', 404);
        user.name = req.body.name || user.name;
        user.address = req.body.address || user.address;
        user.phone = req.body.phone || user.phone;
        if (req.file) {
            user.profilePic = req.file.path;
        }
        await user.save();
        return res.status(200).json({
            success: true,
            user
        });
    } catch (err) {
        return next(err);
    }
};



exports.getMyPets = async (req, res, next) => {

    try {
        const user = await User.findById(req.user.id);
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
        const user = await User.findById(req.user.id); // get user from database
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



