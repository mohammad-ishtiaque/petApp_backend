const Booking = require('../../Booking/Booking');
const Review = require('../../Review/Review');
const Business = require('../../Business/Business');
const BusinessServices = require('../../BusinessServices/Services');
const Owner = require('../../Owner/Owner');
const User = require('../../User/User');
const Pet = require('../../Pet/Pet');
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

// Get all services with owner name, business name, and total bookings
exports.getAllServicesWithStats = asyncHandler(async (req, res, next) => {
    try {
        const services = await BusinessServices.find()
            .populate({
                path: 'businessId',
                select: 'businessName ownerId',
                populate: {
                    path: 'ownerId',
                    select: 'name email phone'
                }
            })
            .select('-password');

        if (!services || services.length === 0) {
            return next(new ApiError('Services not found', 404));
        }

        const servicesWithStats = await Promise.all(
            services.map(async (service) => {
                const bookingsCount = await Booking.countDocuments({ serviceId: service._id });
                
                return {
                    serviceId: service._id,
                    serviceName: service.serviceName,
                    serviceType: service.serviceType,
                    location: service.location,
                    phone: service.phone,
                    openingTime: service.openingTime,
                    closingTime: service.closingTime,
                    offDay: service.offDay,
                    isActive: service.isActive,
                    businessName: service.businessId?.businessName || 'N/A',
                    ownerName: service.businessId?.ownerId?.name || 'N/A',
                    ownerEmail: service.businessId?.ownerId?.email || 'N/A',
                    ownerPhone: service.businessId?.ownerId?.phone || 'N/A',
                    totalBookings: bookingsCount,
                    createdAt: service.createdAt,
                    updatedAt: service.updatedAt
                };
            })
        );

        // Sort by total bookings in descending order
        servicesWithStats.sort((a, b) => b.totalBookings - a.totalBookings);

        res.status(200).json({
            success: true,
            message: 'Services with statistics fetched successfully',
            count: servicesWithStats.length,
            services: servicesWithStats
        });
    } catch (err) {
        return next(err);
    }
});

// Get specific service booking list with pet owner details
exports.getServiceBookingDetails = asyncHandler(async (req, res, next) => {
    try {
        const { serviceId } = req.params;

        if (!serviceId) {
            return next(new ApiError('Service ID is required', 400));
        }

        // First verify the service exists
        const service = await BusinessServices.findById(serviceId)
            .populate({
                path: 'businessId',
                select: 'businessName ownerId',
                populate: {
                    path: 'ownerId',
                    select: 'name email phone'
                }
            });

        if (!service) {
            return next(new ApiError('Service not found', 404));
        }

        // Get all bookings for this service with detailed user and pet information
        const bookings = await Booking.find({ serviceId })
            .populate({
                path: 'userId',
                select: 'name email phone address profilePic'
            })
            .populate({
                path: 'petId',
                select: 'name animalType breed age gender weight height color petPhoto'
            })
            .sort({ createdAt: -1 });

        if (!bookings || bookings.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No bookings found for this service',
                serviceInfo: {
                    serviceId: service._id,
                    serviceName: service.serviceName,
                    serviceType: service.serviceType,
                    businessName: service.businessId?.businessName || 'N/A',
                    ownerName: service.businessId?.ownerId?.name || 'N/A'
                },
                totalBookings: 0,
                bookings: []
            });
        }

        const bookingDetails = bookings.map(booking => ({
            bookingId: booking._id,
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            checkInTime: booking.checkInTime,
            checkOutTime: booking.checkOutTime,
            bookingStatus: booking.bookingStatus,
            selectedService: booking.selectedService,
            serviceType: booking.serviceType,
            notes: booking.notes,
            cancellationReason: booking.cancellationReason,
            petOwner: {
                userId: booking.userId?._id,
                name: booking.userId?.name || 'N/A',
                email: booking.userId?.email || 'N/A',
                phone: booking.userId?.phone || 'N/A',
                address: booking.userId?.address || 'N/A',
                profilePic: booking.userId?.profilePic
            },
            petDetails: {
                petId: booking.petId?._id,
                petName: booking.petId?.name || 'N/A',
                animalType: booking.petId?.animalType || 'N/A',
                breed: booking.petId?.breed || 'N/A',
                age: booking.petId?.age,
                gender: booking.petId?.gender,
                weight: booking.petId?.weight,
                height: booking.petId?.height,
                color: booking.petId?.color,
                petPhoto: booking.petId?.petPhoto
            },
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt
        }));

        res.status(200).json({
            success: true,
            message: 'Service booking details fetched successfully',
            serviceInfo: {
                serviceId: service._id,
                serviceName: service.serviceName,
                serviceType: service.serviceType,
                location: service.location,
                phone: service.phone,
                businessName: service.businessId?.businessName || 'N/A',
                ownerName: service.businessId?.ownerId?.name || 'N/A',
                ownerEmail: service.businessId?.ownerId?.email || 'N/A',
                ownerPhone: service.businessId?.ownerId?.phone || 'N/A'
            },
            totalBookings: bookingDetails.length,
            bookings: bookingDetails
        });
    } catch (err) {
        return next(err);
    }
});
