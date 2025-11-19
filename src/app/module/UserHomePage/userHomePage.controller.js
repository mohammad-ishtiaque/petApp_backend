const Service = require('../BusinessServices/Services');
const Business = require('../Business/Business');
const Owner = require('../Owner/Owner');
const Pet = require('../Pet/Pet');
const User = require('../User/User');
const Review = require('../Review/Review');
const Booking = require('../Booking/Booking');
const Advertisement = require('../Advertisement/Advertisement');
const asyncHandler = require('../../../utils/asyncHandler');
const { ApiError } = require('../../../errors/errorHandler');
const checkIfOpenNow = require('../../../utils/checkOpen');
const QueryBuilder = require('../../../builder/queryBuilder');

// exports.getServicesByType = asyncHandler(async (req, res) => {
//     const type = req.params.type;
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const startIndex = (page - 1) * limit;

//     // Fetch services with pagination
//     const services = await Service.find({ serviceType: type.toUpperCase() })
//         .skip(startIndex)
//         .limit(limit)
//         .lean()
//         .populate({
//             path: 'reviews',
//             select: 'rating comment userId createdAt',
//             populate: { path: 'userId', select: 'name email profilePic' }
//         })

//     if (!services.length) {
//         return res.status(200).json({
//             success: true,
//             message: "Services not found",
//             services: []
//         });
//     }
//     // Calculate average rating and isOpenNow
//     const servicesWithStatus = services.map(service => {
//         const ratings = service.reviews?.map(r => r.rating);
//         const avgRating = ratings?.length
//             ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
//             : 0;

//         return {
//             ...service,
//             isOpenNow: checkIfOpenNow(service),
//             avgRating: parseFloat(avgRating.toFixed(1)) // rounded to 1 decimal
//         };
//     });

//     // Total count for pagination
//     const total = await Service.countDocuments({ serviceType: type.toUpperCase() });

//     res.status(200).json({
//         success: true,
//         message: services.length ? "Services fetched successfully" : "Services not found",
//         services: servicesWithStatus,
//         currentPage: page,
//         pageSize: limit,
//         total,
//     });
// });

exports.getServicesByType = asyncHandler(async (req, res) => {
    const type = req.params.type?.toUpperCase();

    // Inject base query (type filter)
    const baseQuery = Service.find({ serviceType: type }).populate({
        path: 'reviews',
        select: 'rating comment userId createdAt',
        populate: { path: 'userId', select: 'name email profilePic' }
    });
    console.log(baseQuery);

    // Build enhanced query using QueryBuilder
    const queryBuilder = new QueryBuilder(baseQuery, req.query)
        .search(["serviceName", "location"]) // add your searchable fields here
        .filter()
        .sort()
        .fields()
        .paginate();

    // Execute final query
    const services = await queryBuilder.modelQuery.lean();

    // Handle empty
    if (!services.length) {
        return res.status(200).json({
            success: true,
            message: "Services not found",
            services: [],
        });
    }

    // Add avgRating + isOpenNow
    const servicesWithStatus = services.map(service => {
        const ratings = service.reviews?.map(r => r.rating);
        const avgRating = ratings?.length
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
            : 0;

        return {
            ...service,
            isOpenNow: checkIfOpenNow(service),
            avgRating: parseFloat(avgRating.toFixed(1))
        };
    });

    // Pagination metadata
    const meta = await queryBuilder.countTotal();

    res.status(200).json({
        success: true,
        message: "Services fetched successfully",
        services: servicesWithStatus,
        meta,
    });
});



exports.totalPetsForLoggedInUser = asyncHandler(async (req, res) => {
    const totalPets = await Pet.countDocuments({ userId: req.user.id });
    if (!totalPets) {
        return res.status(404).json({
            success: false,
            message: "Pets not found",
            pets: []
        });
    };
    const pets = await Pet.find({ userId: req.user.id });
    if (!pets.length) {
        return res.status(404).json({
            success: false,
            message: "Pets not found",
            pets: []
        });
    };
    // console.log(pets);
    const petList = pets.map(pet => ({
        _id: pet._id,
        petPhoto: pet.petPhoto,
        name: pet.name
    }));

    const user = await User.findById(req.user.id);
    const userPic = user.profilePic;
    //  console.log(petList);

    res.status(200).json({
        success: true,
        message: 'Total pets for logged in user fetched successfully',
        data: {
            totalPets,
            petList,
            userPic
        }
    });
});

exports.allAdsWhichActive = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1; // default page = 1
    const limit = parseInt(req.query.limit) || 10; // default limit = 10
    const skip = (page - 1) * limit;

    // get total count
    const totalAds = await Advertisement.countDocuments({ status: "ACTIVE" });

    // fetch ads with pagination
    const ads = await Advertisement.find({ status: "ACTIVE" })
        .skip(skip)
        .limit(limit);

    if (!ads.length) {
        return res.status(200).json({
            success: true,
            message: "Ads not found",
            ads: []
        });
    }

    const adsPic = ads.map((ad) => ad.advertisementImg);

    res.status(200).json({
        success: true,
        message: "Ads fetched successfully",
        pagination: {
            totalAds,
            currentPage: page,
            totalPages: Math.ceil(totalAds / limit),
            limit,
        },
        ads,
        adsPic
    });
});

exports.getActiveAdsDetails = asyncHandler(async (req, res) => {
    const adsId = req.params.id;
    const ads = await Advertisement.findOne({ status: 'ACTIVE', _id: adsId });
    if (!ads) {
        return res.status(200).json({
            success: true,
            message: "Ads not found",
            ads: []
        });
    }
    const business = await Business.findById(ads.businessId);
    if (!business) {
        return res.status(200).json({
            success: true,
            message: "Business not found",
            business: []
        });
    }
    const services = await Service.find({ businessId: ads.businessId });
    if (!services.length) {
        return res.status(200).json({
            success: true,
            message: "Services not found",
            services: []
        });
    }
    res.status(200).json({
        success: true,
        message: 'Ads fetched successfully',
        ads,
        business,
        services
    });
});

exports.getAllUserHomePageData = asyncHandler(async (req, res) => {
    const type = req.query.type;
    const userId = req.user.id;

    // Get services with reviews
    let servicesQuery = Service.find({ isActive: true });
    if (type) {
        servicesQuery = servicesQuery.where('serviceType').equals(type.toUpperCase());
    }

    const services = await servicesQuery
        .populate({
            path: 'reviews',
            select: 'comment rating',
            options: { sort: { createdAt: -1 } }
        })
        .select('-_id -__v -createdAt -updatedAt')
        .lean();

    // Get user's pets
    const totalPets = await Pet.countDocuments({ userId });
    const pets = await Pet.find({ userId })
        .select('_id name petPhoto')
        .lean();

    // Get active advertisements
    const ads = await Advertisement.find({ status: 'ACTIVE' })
        .select('_id advertisementImg')
        .lean();

    // Get ad details if ad ID is provided
    const adsId = req.query.id;
    const adsDetails = adsId
        ? await Advertisement.findOne({
            _id: adsId,
            status: 'ACTIVE'
        })
            .populate('businessId', 'shopLogo location servicesImages websiteLink')
            .lean()
        : null;

    // Get upcoming appointments for the user
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day

    const upcomingAppointments = await Booking.find({
        userId,
        $or: [
            {
                checkInDate: { $gte: today }, // For hotel bookings
                bookingStatus: { $in: ['PENDING', 'APPROVED'] }
            },
            {
                bookingDate: { $gte: today }, // For regular appointments
                bookingStatus: { $in: ['PENDING', 'APPROVED'] }
            }
        ]
    })
        .sort({
            checkInDate: 1,  // Sort by check-in date first (for hotels)
            bookingDate: 1,  // Then by booking date
            bookingTime: 1   // Then by booking time
        })
        .limit(5) // Limit to 5 upcoming appointments
        .populate('serviceId', 'serviceName serviceType shopLogo')
        .lean();

    // Transform appointments data
    const transformedAppointments = upcomingAppointments.map(appointment => {
        const isHotelBooking = appointment.serviceId?.serviceType === 'HOTEL';
        const date = isHotelBooking ? appointment.checkInDate : appointment.bookingDate;
        const time = isHotelBooking ? appointment.checkInTime : appointment.bookingTime;

        return {
            id: appointment._id,
            service: {
                id: appointment.serviceId?._id,
                name: appointment.serviceId?.serviceName || 'Service not available',
                type: appointment.serviceId?.serviceType,
                image: appointment.serviceId?.shopLogo
            },
            date: date,
            time: time,
            status: appointment.bookingStatus,
            isHotelBooking,
            ...(isHotelBooking && {
                checkInDate: appointment.checkInDate,
                checkOutDate: appointment.checkOutDate,
                checkInTime: appointment.checkInTime,
                checkOutTime: appointment.checkOutTime
            }),
            notes: appointment.notes
        };
    });

    // Transform services data (existing code)
    const transformedServices = services.map(service => {
        const avgRating = service.reviews?.length
            ? (service.reviews.reduce((sum, r) => sum + r.rating, 0) / service.reviews.length).toFixed(1)
            : 0;

        return {
            id: service._id,
            type: service.serviceType,
            name: service.serviceName,
            location: service.location,
            contact: {
                phone: service.phone,
                website: service.websiteLink
            },
            hours: {
                opening: service.openingTime,
                closing: service.closingTime,
                offDay: service.offDay,
                isOpenNow: checkIfOpenNow(service)
            },
            images: {
                logo: service.shopLogo,
                gallery: service.servicesImages ? [service.servicesImages] : []
            },
            services: service.providings,
            stats: {
                totalBookings: service.bookings?.length || 0,
                totalReviews: service.reviews?.length || 0,
                averageRating: parseFloat(avgRating)
            },
            reviews: service.reviews?.slice(0, 3) || []
        };
    });

    // Transform pets data (existing code)
    const transformedPets = pets.map(pet => ({
        id: pet._id,
        name: pet.name,
        photo: pet.petPhoto
    }));

    // Transform ads data (existing code)
    const transformedAds = ads.map(ad => ({
        id: ad._id,
        images: ad.advertisementImg
    }));

    // Transform ad details if exists (existing code)
    let transformedAdDetails = null;
    if (adsDetails) {
        transformedAdDetails = {
            id: adsDetails._id,
            images: adsDetails.advertisementImg,
            business: adsDetails.businessId ? {
                logo: adsDetails.businessId.shopLogo,
                location: adsDetails.businessId.location,
                images: adsDetails.businessId.servicesImages,
                website: adsDetails.businessId.websiteLink
            } : null
        };
    }

    res.status(200).json({
        success: true,
        message: 'All user home page data fetched successfully',
        data: {
            services: transformedServices,
            appointments: transformedAppointments, // Add appointments to response
            pets: {
                total: totalPets,
                list: transformedPets
            },
            advertisements: {
                featured: transformedAds,
                details: transformedAdDetails
            }
        }
    });
});

exports.searchServices = asyncHandler(async (req, res) => {
    const { q: searchQuery, serviceType, location, isOpen, sortBy, sortOrder } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // Base DB filter
    const filter = { isActive: true };

    // Text search across multiple fields
    if (searchQuery && searchQuery.trim()) {
        const regex = new RegExp(searchQuery.trim(), 'i');
        filter.$or = [
            { serviceName: { $regex: regex } },
            { location: { $regex: regex } },
            { providings: { $elemMatch: { $regex: regex } } },
        ];
    }

    // Filter by service type (case-insensitive; store as UPPER in DB)
    if (serviceType && String(serviceType).trim()) {
        filter.serviceType = String(serviceType).trim().toUpperCase();
    }

    // Filter by location
    if (location && String(location).trim()) {
        filter.location = { $regex: new RegExp(String(location).trim(), 'i') };
    }

    // Query and join reviews for rating calculation
    let services = await Service.find(filter)
        .populate('reviews', 'rating')
        .lean();

    // Augment with computed fields
    let servicesWithStatus = services.map(service => {
        const ratings = service.reviews?.map(r => r.rating) || [];
        const avgRating = ratings.length ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) : 0;
        const totalReviews = service.reviews?.length || 0;
        const totalBookings = Array.isArray(service.bookings) ? service.bookings.length : (service.bookingsCount || 0);

        return {
            ...service,
            isOpenNow: checkIfOpenNow(service),
            avgRating: parseFloat(avgRating.toFixed(1)),
            totalReviews,
            totalBookings,
        };
    });

    // Optional in-memory filter for open status
    if (String(isOpen).toLowerCase() === 'true') {
        servicesWithStatus = servicesWithStatus.filter(s => s.isOpenNow);
    }

    // Sorting improvements
    if (sortBy) {
        const order = sortOrder === 'desc' ? -1 : 1;
        servicesWithStatus.sort((a, b) => {
            switch (sortBy) {
                case 'avgRating':
                    return (a.avgRating - b.avgRating) * order;
                case 'totalReviews':
                    return (a.totalReviews - b.totalReviews) * order;
                case 'totalBookings':
                    return (a.totalBookings - b.totalBookings) * order;
                case 'name':
                case 'serviceName':
                    return a.serviceName?.localeCompare(b.serviceName || '') * order;
                default:
                    // Fallback to raw property compare if present
                    if (a[sortBy] === b[sortBy]) return 0;
                    return (a[sortBy] > b[sortBy] ? 1 : -1) * order;
            }
        });
    }

    const total = servicesWithStatus.length;
    const paginatedServices = servicesWithStatus.slice(startIndex, startIndex + limit);

    res.status(200).json({
        success: true,
        message: total ? 'Services fetched successfully' : 'No services found matching your criteria.',
        services: paginatedServices,
        currentPage: page,
        pageSize: limit,
        total
    });
});
