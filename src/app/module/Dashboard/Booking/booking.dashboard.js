const Booking = require('../../Booking/Booking');
const Review = require('../../Review/Review');
const Business = require('../../Business/Business');
const BusinessServices = require('../../BusinessServices/Services');
const { ApiError } = require('../../../../errors/errorHandler');
const asyncHandler = require('../../../../utils/asyncHandler');

exports.getAllBusiness = asyncHandler(async (req, res, next) => {
    try {
        const business = await Business.find().select('-password');
        if (!business) {
            return next(new ApiError('business not found', 404));
        }
        res.status(200).json({
            success: true,
            message: 'business fetched successfully',
            business
        });
    } catch (err) {
        return next(err);
    }
});

exports.getServicesByBusinessId = asyncHandler(async (req, res, next) => {
    try {
        const businessId = req.params._id || req.params.id;
        const services = await BusinessServices.find({ businessId }).select('-password');
        if (!services) {
            return next(new ApiError('services not found', 404));
        }
        const bookings = await Promise.all(
            services.map(async (service) => {
                const bookingIds = service.bookings;
                const booking = await Booking.find({ _id: { $in: bookingIds } }).select('-password');
                if (!booking) {
                    return [];
                }
                return booking;
            })
        );
        res.status(200).json({
            success: true,
            message: 'services fetched successfully',
            services,
            bookings
        });
    } catch (err) {
        return next(err);
    }
});

// exports.getAllReviews = asyncHandler(async (req, res, next) => {
//     try {
//         const reviews = await Review.find().select('-password');
//         if (!reviews) {
//             return next(new ApiError('reviews not found', 404));
//         }
//         res.status(200).json({
//             success: true,
//             message: 'reviews fetched successfully',
//             reviews
//         });
//     } catch (err) {
//         return next(err);
//     }
// });

// exports.getAllServices = asyncHandler(async (req, res, next) => {
//     try {
//         const services = await BusinessServices.find().select('-password');
//         if (!services) {
//             return next(new ApiError('services not found', 404));
//         }
//         res.status(200).json({
//             success: true,
//             message: 'services fetched successfully',
//             services
//         });
//     } catch (err) {
//         return next(err);
//     }
// });