const TermsCondition = require('./TermsCondition');
const { ApiError } = require('../../../../errors/errorHandler');
const asyncHandler = require('../../../../utils/asyncHandler');

exports.createTermsCondition = asyncHandler(async (req, res, next) => {
    try {
        const termsCondition = new TermsCondition({
            description: req.body.description
        });
        await termsCondition.save();
        res.status(201).json({
            success: true,
            message: 'Terms Condition created successfully',
            termsCondition
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});


exports.getAllTermsConditions = asyncHandler(async (req, res, next) => {
    try {
        const termsConditions = await TermsCondition.findOne();
        if (!termsConditions) throw new ApiError('Terms Conditions not found', 404);
        res.status(200).json({
            success: true,
            message: 'Terms Conditions fetched successfully',
            termsConditions
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
}); 

exports.updateTermsCondition = asyncHandler(async (req, res, next) => {
    try {
        const termsCondition = await TermsCondition.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!termsCondition) throw new ApiError('Terms Condition not found', 404);
        res.status(200).json({
            success: true,
            message: 'Terms Condition updated successfully',
            termsCondition
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

exports.deleteTermsCondition = asyncHandler(async (req, res, next) => {
    try {
        const termsCondition = await TermsCondition.findByIdAndDelete(req.params.id);
        if (!termsCondition) throw new ApiError('Terms Condition not found', 404);
        res.status(200).json({
            success: true,
            message: 'Terms Condition deleted successfully',
            termsCondition
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});


exports.getTermsConditionById = asyncHandler(async (req, res, next) => {
    try {
        const termsCondition = await TermsCondition.findById(req.params.id);
        if (!termsCondition) throw new ApiError('Terms Condition not found', 404);
        res.status(200).json({
            success: true,
            message: 'Terms Condition fetched successfully',
            termsCondition
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

