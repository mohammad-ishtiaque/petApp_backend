const BusinessOwner = require('../../Owner/Owner');
const { ApiError } = require('../../../../errors/errorHandler');
const asyncHandler = require('../../../../utils/asyncHandler');
const Business = require('../../Business/Business');
const Review = require('../../Review/Review');
const BusinessServices = require('../../BusinessServices/Services');
exports.getBusinessOwnerDetailsById = asyncHandler(async (req, res, next) => {
    try {
        const id = req.params.id || req.params._id;
        const owner = await BusinessOwner.findById(id).select('-password');
        if (!owner) {
            return next(new ApiError('Owner not found', 404));
        }
        const business = await Business.findOne({ownerId: id});
        if (!business) {
            return next(new ApiError('Business not found', 404));
        }
        const services = await BusinessServices.find({businessId: business._id});
        if (!services) {
            return next(new ApiError('Services not found', 404));
        }
        const reviews = await Review.find({businessId: business._id});
        if (!reviews) {
            return next(new ApiError('Reviews not found', 404));
        }
        res.status(200).json({
            success: true,
            message: 'Owner fetched successfully',
            owner,
            business,
            services,
            reviews
        });
    } catch (err) {
        return next(err);
    }
});

exports.getAllBusinessOwners = asyncHandler(async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const owners = await BusinessOwner.find().select('-password').skip(startIndex).limit(limit);
        if (!owners) {
            return next(new ApiError('Owners not found', 404));
        }
        res.status(200).json({
            success: true,
            message: 'Owners fetched successfully',
            owners,
            total: await BusinessOwner.countDocuments(),
            currentPage: page,
            pageSize: limit
        });
    } catch (err) {
        return next(err);
    }
});


exports.blockBusinessOwner = asyncHandler(async (req, res, next) => {
    try {
        const id = req.params.id || req.params._id;
        const owner = await BusinessOwner.findById(id).select('-password');
        if (!owner) {
            return next(new ApiError('Owner not found', 404));
        }
        owner.isBlocked = true;
        await owner.save();
        res.status(200).json({
            success: true,
            message: 'Owner blocked successfully',
        });
    } catch (err) {
        return next(err);
    }
});


exports.unblockBusinessOwner = asyncHandler(async (req, res, next) => {
    try {
        const id = req.params.id || req.params._id;
        const owner = await BusinessOwner.findById(id).select('-password');
        if (!owner) {
            return next(new ApiError('Owner not found', 404));
        }
        owner.isBlocked = false;
        await owner.save();
        res.status(200).json({
            success: true,
            message: 'Owner unblocked successfully',
        });
    } catch (err) {
        return next(err);
    }
});



