const User = require('../../User/User');
const { ApiError } = require('../../../../errors/errorHandler');
const asyncHandler = require('../../../../utils/asyncHandler');
const Pet = require('../../Pet/Pet');
exports.getPetOwnerDetailsById = asyncHandler(async (req, res, next) => {
    try {
        const id = req.params.id || req.params._id;
        const user = await User.findById(id).select('-password');
        if (!user) {
            return next(new ApiError('User not found', 404));
        }
        const pets = await Pet.find({userId: id});
        if (!pets) {
            return next(new ApiError('Pets not found', 404));
        }
        res.status(200).json({
            success: true,
            message: 'User fetched successfully',
            user,
            pets
        });
    } catch (err) {
        return next(err);
    }
});

exports.getAllPetOwners = asyncHandler(async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const users = await User.find().select('-password').skip(startIndex).limit(limit);
        if (!users) {
            return next(new ApiError('Users not found', 404));
        }
        res.status(200).json({
            success: true,
            message: 'Users fetched successfully',
            users,
            total: await User.countDocuments(),
            currentPage: page,
            pageSize: limit
        });
    } catch (err) {
        return next(err);
    }
});

exports.blockPetOwner = asyncHandler(async (req, res, next) => {
    try {
        const id = req.params.id || req.params._id;
        const user = await User.findById(id);
        if (!user) {
            return next(new ApiError('User not found', 404));
        }
        user.isBlocked = true;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'User blocked successfully',
            user
        });
    } catch (err) {
        return next(err);
    }
});

exports.unblockPetOwner = asyncHandler(async (req, res, next) => {
    try {
        const id = req.params.id || req.params._id;
        const user = await User.findById(id);
        if (!user) {
            return next(new ApiError('User not found', 404));
        }
        user.isBlocked = false;
        await user.save();
        res.status(200).json({
            success: true,
            message: 'User unblocked successfully',
            user
        });
    } catch (err) {
        return next(err);
    }
});
