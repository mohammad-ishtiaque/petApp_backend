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
        let businessCount = business.length;
        // let bookingsCount = 0;
        const businessWithBookings = await Promise.all(
            business.map(async (businessItem) => {
                const bookings = await Booking.find({ businessId: businessItem._id });
                if (!bookings) {
                    return next(new ApiError('bookings not found', 404));
                }
                return {
                    ...businessItem.toObject(),
                    bookingsCount: bookings.length,
                };
            })
        );
        res.status(200).json({
            success: true,
            message: 'business fetched successfully',
            business: businessWithBookings,
        });
    } catch (err) {
        return next(err);
    }
});

exports.getAllBookingsByBusinessId = asyncHandler(async (req, res, next) => {
    try {
        const businessId = req.params._id || req.params.id;
        const bookings = await Booking.find({ businessId }).select('-password');
        if (!bookings) {
            return next(new ApiError('bookings not found', 404));
        }
        res.status(200).json({
            success: true,
            message: 'bookings fetched successfully',
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