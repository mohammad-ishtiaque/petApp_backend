const Advertisement = require('../../module/Advertisement/Advertisement');
const Service = require('../../module/BusinessServices/Services');
const asyncHandler = require('../../../utils/asyncHandler');
const checkIfOpenNow = require('../../../utils/checkOpen');
const { ApiError } = require('../../../errors/errorHandler');

exports.getAllServicesByCategory = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const services = await Service.find({ serviceType: category })
        .skip(startIndex).limit(limit);

    if (!services) throw new ApiError('Services not found', 404);
    if (services.length === 0) throw new ApiError(null, 404);
    res.status(200).json({
        success: true,
        message: 'Services fetched successfully',
        services,
        currentPage: page,
        pageSize: limit,
        startIndex,
        endIndex,
        total: await Service.countDocuments({ serviceType: category })
    });
});

exports.searchServices = asyncHandler(async (req, res) => {
    const { q: searchQuery, serviceType, location, isOpen, sortBy, sortOrder } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const filter = { isActive: true };

    if (searchQuery) {
        // Case-insensitive search on service name and description
        filter.$or = [
            { serviceName: { $regex: searchQuery, $options: 'i' } },
            { description: { $regex: searchQuery, $options: 'i' } }
        ];
    }

    if (serviceType) {
        filter.serviceType = serviceType.toUpperCase();
    }

    if (location) {
        filter.location = { $regex: location, $options: 'i' };
    }

    // Find initial services based on DB filters
    let services = await Service.find(filter).lean().populate('reviews', 'rating');

    // In-memory filtering and data augmentation
    let servicesWithStatus = services.map(service => {
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

    // In-memory filter for isOpen
    if (isOpen === 'true') {
        servicesWithStatus = servicesWithStatus.filter(service => service.isOpenNow);
    }

    // Sorting
    if (sortBy) {
        servicesWithStatus.sort((a, b) => {
            const order = sortOrder === 'desc' ? -1 : 1;
            return (a[sortBy] > b[sortBy] ? 1 : -1) * order;
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

exports.getAllAdvertisements = asyncHandler(async (req, res) => {
    const advertisements = await Advertisement.find();
    res.status(200).json({
        success: true,
        message: 'Advertisements fetched successfully',
        advertisements
    });
});
