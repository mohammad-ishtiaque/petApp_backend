const Help = require('./Help');
const asyncHandler = require('../../../../utils/asyncHandler');
const { ApiError } = require('../../../../errors/errorHandler');

exports.createHelp = asyncHandler(async (req, res, next) => {

    try {
        const help = new Help({
            userId: req.user._id || req.user.id,
            email: req.body.email,
            phone: req.body.phone,
            message: req.body.message
        });
        await help.save();
        res.status(201).json({
            success: true,
            message: 'Help created successfully',
            help
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

exports.getAllHelps = asyncHandler(async (req, res, next) => {
    try {
        const helps = await Help.find();
        if (!helps) throw new ApiError('Helps not found', 404);
        res.status(200).json({
            success: true,
            message: 'Helps fetched successfully',
            helps
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

exports.updateHelp = asyncHandler(async (req, res, next) => {
    try {
        const help = await Help.findByIdAndUpdate(req.params.id, { status: req.body.status === 'PENDING' ? 'COMPLETED' : 'PENDING' }, { new: true });
        if (!help) throw new ApiError('Help not found', 404);
        res.status(200).json({
            success: true,
            message: 'Help updated successfully',
            help
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

exports.deleteHelp = asyncHandler(async (req, res, next) => {
    try {
        const help = await Help.findByIdAndDelete(req.params.id);
        if (!help) throw new ApiError('Help not found', 404);
        res.status(200).json({
            success: true,
            message: 'Help deleted successfully',
            help
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

exports.getHelpById = asyncHandler(async (req, res, next) => {
    try {
        const help = await Help.findById(req.params.id);
        if (!help) throw new ApiError('Help not found', 404);
        res.status(200).json({
            success: true,
            message: 'Help fetched successfully',
            help
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});
