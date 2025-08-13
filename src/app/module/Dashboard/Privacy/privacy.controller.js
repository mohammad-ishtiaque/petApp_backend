const Privacy = require('./Privacy');
const asyncHandler = require('../../../../utils/asyncHandler');
const { ApiError } = require('../../../../errors/errorHandler');


exports.createPrivacy = asyncHandler(async (req, res, next) => {
    try {
        const privacy = new Privacy({
            description: req.body.description
        });
        await privacy.save();
        res.status(201).json({
            success: true,
            message: 'Privacy created successfully',
            privacy
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});


exports.getAllPrivacies = asyncHandler(async (req, res, next) => {
    try {
        const privacies = await Privacy.find();
        if (!privacies) throw new ApiError('Privacies not found', 404);
        res.status(200).json({
            success: true,
            message: 'Privacies fetched successfully',
            privacies
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
}); 

exports.updatePrivacy = asyncHandler(async (req, res, next) => {
    try {
        const privacy = await Privacy.findByIdAndUpdate(req.params.id, { description: req.body.description }, { new: true });
        if (!privacy) throw new ApiError('Privacy not found', 404);
        res.status(200).json({
            success: true,
            message: 'Privacy updated successfully',
            privacy
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});



exports.deletePrivacy = asyncHandler(async (req, res, next) => {
    try {
        const privacy = await Privacy.findByIdAndDelete(req.params.id);
        if (!privacy) throw new ApiError('Privacy not found', 404);
        res.status(200).json({
            success: true,
            message: 'Privacy deleted successfully',
            privacy
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});


exports.getPrivacyById = asyncHandler(async (req, res, next) => {
    try {
        const privacy = await Privacy.findById(req.params.id);
        if (!privacy) throw new ApiError('Privacy not found', 404);
        res.status(200).json({
            success: true,
            message: 'Privacy fetched successfully',
            privacy
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});
    