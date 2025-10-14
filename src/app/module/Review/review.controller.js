const Review = require('./Review');
const Business = require('../Business/Business');
const Service = require('../BusinessServices/Services');
const asyncHandler = require('../../../utils/asyncHandler');
const {ApiError} = require('../../../errors/errorHandler');
const User = require('../User/User');

exports.createReview = asyncHandler(async (req, res, next) => {
    //when user click on the particular service, than it will get the businessId, ownerId, serviceId
    //and then it will create the review
  
    const userId = req.user.id || req.user._id;
    const { comment, rating, businessId, ownerId, serviceId } = req.body;
    const review = await Review.create({ comment, rating, businessId, ownerId, userId, serviceId });
    
    res.status(201).json({
        success: true,
        message: 'Review created successfully',
        review
    });

    //after creating the review, it will update the review in the business and service
    const business = await Business.findById(businessId);
    const existingReview = business.reviews.find(reviewId => reviewId.toString() === userId.toString());
    const newReviews = existingReview
        ? business.reviews.map(reviewId => reviewId.toString() === userId.toString() ? review._id : reviewId)
        : [...business.reviews, review._id];
    business.reviews = newReviews;
    await business.save();
    const service = await Service.findById(serviceId);
    const existingServiceReview = service.reviews.find(reviewId => reviewId.toString() === userId.toString());
    const newServiceReviews = existingServiceReview
        ? service.reviews.map(reviewId => reviewId.toString() === userId.toString() ? review._id : reviewId)
        : [...service.reviews, review._id];
    service.reviews = newServiceReviews;
    await service.save();
});

exports.getReview = asyncHandler(async (req, res, next) => {
    const review = await Review.findById(req.params.id);
    if (!review) {
        return next(new ApiError('Review not found', 404));
    }
    res.status(200).json({
        success: true,
        message: 'Review fetched successfully',
        review
    });
});


exports.getAllReviewsByBusinessId = asyncHandler(async (req, res, next) => {
    const reviews = await Review.find({ businessId: req.params.id });

    if (!reviews) {
        return next(new ApiError('Reviews not found', 404));
    }

    // Calculate average rating
    let avgRating = 0;
    if (reviews.length > 0) {
        avgRating = reviews.reduce((acc, review) => acc + (review.rating || 0), 0) / reviews.length;
        avgRating = Number(avgRating.toFixed(1));
    }

    res.status(200).json({
        success: true,
        message: 'Reviews fetched successfully',
        avgRating,
        reviews,
        totalReviews: reviews.length
    });
});

exports.getAllReviewsByServiceId = asyncHandler(async (req, res, next) => {
    const reviews = await Review.find({ serviceId: req.params.id }).populate('userId', 'name profilePic');

    // console.log(users);
    if (!reviews) {
        return next(new ApiError('Reviews not found', 404));
    }
    const avgRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    res.status(200).json({
        success: true,
        message: 'Reviews fetched successfully',
        reviews,
        avgRating,
        totalReviews: reviews.length
    });
});


exports.getAllReviewsByUserId = asyncHandler(async (req, res, next) => {
    const reviews = await Review.find({ userId: req.user.id || req.user._id });
    if (!reviews) {
        return next(new ApiError('Reviews not found', 404));
    }
    res.status(200).json({
        success: true,
        message: 'Reviews fetched successfully',
        reviews
    });
});

// Get all reviews for services owned by the authenticated owner, with optional serviceType filter and pagination
exports.getOwnerServiceReviews = asyncHandler(async (req, res, next) => {
    const ownerId = req.owner?.id || req.owner?._id;
    const { serviceType } = req.query; // e.g., VET|TRAINING|GROOMING
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Find the owner's single business
    const business = await Business.findOne({ ownerId }).select('_id');
    if (!business) return next(new ApiError('Business not found', 404));

    // Gather services under this business, optionally filtered by serviceType
    const serviceMatch = { businessId: business._id };
    if (serviceType) {
        serviceMatch.serviceType = String(serviceType).trim().toUpperCase();
    }
    const services = await Service.find(serviceMatch).select('_id serviceName serviceType');
    const serviceIds = services.map(s => s._id);

    // Query reviews for these services
    const match = { serviceId: { $in: serviceIds } };
    const [reviews, total] = await Promise.all([
        Review.find(match)
            .populate('userId', 'name profilePic')
            .populate('serviceId', 'serviceName serviceType')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Review.countDocuments(match)
    ]);

    let avgRating = 0;
    if (reviews.length > 0) {
        avgRating = reviews.reduce((acc, review) => acc + (review.rating || 0), 0) / reviews.length;
        avgRating = Number(avgRating.toFixed(1));
    }

    res.status(200).json({
        success: true,
        message: 'Owner service reviews fetched successfully',
        filters: { serviceType: serviceType ? String(serviceType).trim().toUpperCase() : undefined },
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        avgRating,
        reviews
    });
});

