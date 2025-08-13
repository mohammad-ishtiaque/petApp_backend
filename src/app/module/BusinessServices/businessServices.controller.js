const Service = require('./Services');
const Business = require('../Business/Business');
const { ApiError } = require('../../../errors/errorHandler');
const asyncHandler = require('../../../utils/asyncHandler');

exports.createService = asyncHandler(async (req, res, next) => {
    try {
        const ownerId = req.owner.id;
        // console.log(ownerId);
        const business = await Business.findOne({ ownerId });
        const businessId = business._id;

        const servicesImages = req.files ? req.files.map(file => file.path) : [];
        const { serviceType, serviceName, location, openingTime, closingTime, offDay, providings, websiteLink, phone } = req.body;

        const existingService = await Service.findOne({ businessId, serviceType: serviceType.toUpperCase() });
        if (existingService) throw new ApiError('An owner cannot create one service with the same service type', 400);

        const service = new Service({
            serviceType: serviceType.trim().toUpperCase(),
            serviceName: serviceName.trim(),
            location: location.trim(),
            openingTime: openingTime.trim(),
            closingTime: closingTime.trim(),
            offDay: offDay.trim(),
            websiteLink: websiteLink.trim(),
            providings: providings.map(providing => providing.trim()),
            phone,
            servicesImages,
            businessId
        });

        business.services.push(service._id);
        await business.save();

        await service.save();
        return res.status(201).json({
            success: true,
            message: 'Service created successfully',
            service
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});


exports.getAllServices = asyncHandler(async (req, res, next) => {
    const ownerId = req.owner?.id || req.owner?._id;
    const business = await Business.findOne({ ownerId });

    const businessId = business?._id;
    const shopLogo = business?.shopLogo;
    // console.log(businessId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    try {
        const services = await Service.find({ businessId }).skip(startIndex).limit(limit);

        services.forEach(service => {
            service.shopLogo = shopLogo;
        });

        // console.log(businessDetails);
        if (!services) throw new ApiError('Services not found', 404);
        if (services.length === 0) throw new ApiError('No services found', 404);
        return res.status(200).json({
            success: true,
            message: 'Services fetched successfully',
            services,
            total: await Service.countDocuments({ businessId }),
            currentPage: page,
            pageSize: limit,
            startIndex,
            endIndex
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

exports.updateService = asyncHandler(async (req, res, next) => {
    try {
        const service = await Service.findByIdAndUpdate(req.params.id,
            { 
                serviceName: req.body.serviceName, 
                location: req.body.location, 
                openingTime: req.body.openingTime, 
                closingTime: req.body.closingTime, 
                offDay: req.body.offDay, 
                websiteLink: req.body.websiteLink, 
                providings: req.body.providings ,
                phone: req.body.phone
            }, 
            { new: true });
        if (!service) throw new ApiError('Service not found', 404);
        res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            service
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});

exports.deleteService = asyncHandler(async (req, res, next) => {
    try {
        const serviceId = req.params.id;
        const service = await Service.findByIdAndUpdate(serviceId);
        if (!service) throw new ApiError('Service not found', 404);
        const business = await Business.findByIdAndUpdate(service.businessId, { $pull: { services: serviceId } });
        if (!business) throw new ApiError('Business not found', 404);
        await service.deleteOne();
        res.status(200).json({
            success: true,
            message: 'Service deleted successfully',
            service
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});


exports.getServicesById = asyncHandler(async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) throw new ApiError('Service not found', 404);
        const shopLogo = await Business.findById(service.businessId);
        service.shopLogo = shopLogo;
        res.status(200).json({
            success: true,
            message: 'Service fetched successfully',
            service,
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
});




// exports.getBusinessTypes = async (req, res, next) => {
//     try {
//         const businessTypes = await Business.find();
//         if (!businessTypes) throw new ApiError('Business types not found', 404);
//         return res.status(200).json({
//             success: true,
//             message: 'Business types fetched successfully',
//             businessTypes
//         });
//     } catch (err) {
//         throw new ApiError(err.message, 500);
//     }
// };