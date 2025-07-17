const Review = require('./Review');
const Business = require('../Business/Business');
const Service = require('../BusinessServices/Services');
const asyncHandler = require('../../../utils/asyncHandler');
const {ApiError} = require('../../../errors/errorHandler');


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
    res.status(200).json({
        success: true,
        message: 'Reviews fetched successfully',
        reviews
    });
});

exports.getAllReviewsByServiceId = asyncHandler(async (req, res, next) => {
    const reviews = await Review.find({ serviceId: req.params.id });   
    if (!reviews) {
        return next(new ApiError('Reviews not found', 404));
    }
    res.status(200).json({
        success: true,
        message: 'Reviews fetched successfully',
        reviews
    });
});

