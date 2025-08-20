const Advertisement = require('../../module/Advertisement/Advertisement');
const Service = require('../../module/BusinessServices/Services');
const asyncHandler = require('../../../utils/asyncHandler');
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


exports.getAllAdvertisements = asyncHandler(async (req, res) => {
    const advertisements = await Advertisement.find();
    res.status(200).json({
        success: true,
        message: 'Advertisements fetched successfully',
        advertisements
    });
});

