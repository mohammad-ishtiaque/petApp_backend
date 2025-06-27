const User = require('../User/User');
const Pet = require('../Pet/Pet');
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
exports.changePassword = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) throw new ApiError('User not found', 404);
        const isMatch = await bcrypt.compare(req.body.oldPassword, user.password);
        if (!isMatch) throw new ApiError('Invalid old password', 401);
        user.password = req.body.newPassword;
        await user.save();
        return res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (err) {
        return next(err);
    }
};




