const BusinessOwner = require('../../Owner/Owner');
const { ApiError } = require('../../../../errors/errorHandler');
const asyncHandler = require('../../../../utils/asyncHandler');

exports.getBusinessOwnerDetailsById = asyncHandler(async (req, res, next) => {
    try {
        const id = req.params.id || req.params._id;
        const owner = await BusinessOwner.findById(id).select('-password');
        if (!owner) {
            return next(new ApiError('Owner not found', 404));
        }
        res.status(200).json({
            success: true,
            message: 'Owner fetched successfully',
            owner
        });
    } catch (err) {
        return next(err);
    }
});


exports.blockBusinessOwner = asyncHandler(async (req, res, next) => {
    try {
        const id = req.params.id || req.params._id;
        const owner = await BusinessOwner.findById(id);
        if (!owner) {
            return next(new ApiError('Owner not found', 404));
        }
        owner.isBlocked = true;
        await owner.save();
        res.status(200).json({
            success: true,
            message: 'Owner blocked successfully',
            owner
        });
    } catch (err) {
        return next(err);
    }
});


exports.unblockBusinessOwner = asyncHandler(async (req, res, next) => {
    try {
        const id = req.params.id || req.params._id;
        const owner = await BusinessOwner.findById(id);
        if (!owner) {
            return next(new ApiError('Owner not found', 404));
        }
        owner.isBlocked = false;
        await owner.save();
        res.status(200).json({
            success: true,
            message: 'Owner unblocked successfully',
            owner
        });
    } catch (err) {
        return next(err);
    }
});



