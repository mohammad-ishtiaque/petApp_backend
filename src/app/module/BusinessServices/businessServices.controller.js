const Service = require('./Services');
const Business = require('../Business/Business');
const { ApiError } = require('../../../errors/errorHandler');
const asyncHandler = require('../../../utils/asyncHandler');
const path = require('path');
const fs = require('fs');
const { deleteFile } = require('../../../utils/unLinkFiles');
const checkIfOpenNow = require('../../../utils/checkOpen');
const Owner = require('../Owner/Owner');
const {createAdminNotification} = require('../Notification/notification.controller');

// Find nearby services by type within a radius (default 10km)
exports.getNearbyServices = asyncHandler(async (req, res, next) => {
    try {
        const { type, lat, long, radiusKm = 10 } = req.query;

        if (!type) throw new ApiError('Query param "type" is required', 400);
        if (lat === undefined || long === undefined) {
            throw new ApiError('Query params "lat" and "long" are required', 400);
        }

        const userLat = parseFloat(lat);
        const userLng = parseFloat(long);
        const radius = radiusKm ? parseFloat(radiusKm) : 10;

        if (Number.isNaN(userLat) || Number.isNaN(userLng)) {
            throw new ApiError('Invalid coordinates provided', 400);
        }

        const typeUpper = String(type).trim().toUpperCase();

        const services = await Service.aggregate([
            {
                $match: {
                    serviceType: typeUpper,
                    isActive: true,
                    latitude: { $exists: true, $ne: null, $ne: '' },
                    longitude: { $exists: true, $ne: null, $ne: '' }
                }
            },
            {
                $addFields: {
                    latNum: { $toDouble: '$latitude' },
                    lngNum: { $toDouble: '$longitude' }
                }
            },
            {
                $addFields: {
                    distanceKm: {
                        $let: {
                            vars: {
                                lat1: { $degreesToRadians: userLat },
                                lon1: { $degreesToRadians: userLng },
                                lat2: { $degreesToRadians: '$latNum' },
                                lon2: { $degreesToRadians: '$lngNum' }
                            },
                            in: {
                                $multiply: [
                                    6371,
                                    {
                                        $acos: {
                                            $add: [
                                                { $multiply: [ { $sin: '$$lat1' }, { $sin: '$$lat2' } ] },
                                                { $multiply: [ { $cos: '$$lat1' }, { $cos: '$$lat2' }, { $cos: { $subtract: ['$$lon2', '$$lon1'] } } ] }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            { $match: { distanceKm: { $lte: radius } } },
            { $sort: { distanceKm: 1 } },
            { $limit: 100 }
        ]);

        // Attach open/close status in response (aggregation doesn't apply virtuals)
        const results = services.map((s) => ({
            ...s,
            isOpenNow: checkIfOpenNow(s)
        }));

        return res.status(200).json({
            success: true,
            message: 'Nearby services fetched successfully',
            services: results,
            count: results.length
        });
    } catch (err) {
        throw new ApiError(err.message, err.statusCode || 500);
    }
});

exports.createService = asyncHandler(async (req, res, next) => {
    try {
        const ownerId = req.owner.id;
        const owner = await Owner.findById(ownerId);
        const business = await Business.findOne({ ownerId });
        if (!business) {
            throw new ApiError('Business not found for the authenticated owner', 404);
        }
        const businessId = business._id;
        const shopLogo = business?.shopLogo;

        const servicesImages = req.file ? (req.file.location || req.file.path || null) : null;
        const { serviceType, serviceName, location, openingTime, closingTime, offDay, providings, websiteLink, phone, latitude, longitude } = req.body;

        const existingService = await Service.findOne({ businessId, serviceType: serviceType.toUpperCase() });
        if (existingService) throw new ApiError('An owner cannot create one service with the same service type', 400);

        const service = new Service({
            serviceType: serviceType?.trim().toUpperCase(),
            serviceName: serviceName?.trim(),
            location: location?.trim(),
            latitude: latitude?.trim(),
            longitude: longitude?.trim(),
            openingTime: openingTime?.trim(),
            closingTime: closingTime?.trim(),
            offDay: offDay?.trim(),
            websiteLink: websiteLink?.trim(),
            providings: Array.isArray(providings) ? providings.map(providing => providing.trim()) : [providings.trim()],
            phone,
            servicesImages,
            businessId,
            shopLogo
        });

        business.services.push(service._id);
        await business.save();

        await service.save();
        createAdminNotification({
            title: 'A new service has been created by ' + owner.name,
            message: `A New Service has been created by ${owner.name} with name ${service.serviceName} under ${business.businessName}`,
        });
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
    

    if (!business) {
        throw new ApiError('Business not found for the authenticated owner', 404);
    }

    const businessId = business._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    try {
        const services = await Service.find({ businessId })
            .skip(startIndex)
            .limit(limit)
            .lean();

        if (!services || services.length === 0) {
            throw new ApiError("No services found", 404);
        }

        const servicesWithStatus = services.map(service => ({
            ...service,
            isOpenNow: checkIfOpenNow(service)
        }));

        return res.status(200).json({
            success: true,
            message: "Services fetched successfully",
            services: servicesWithStatus,
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

exports.updateService = async (req, res, next) => {
    const serviceId = req.params.id;

    const { serviceName, location, openingTime, closingTime, offDay, websiteLink, providings, phone, latitude, longitude } = req.body;

    try {
        const service = await Service.findById(serviceId);
        if (!service) throw new ApiError('Service not found', 404);

        if (req.file) {
            if (service.servicesImages && !/^https?:\/\//i.test(service.servicesImages)) {
                await deleteFile(path.join(__dirname, '..', '..', '..', service.servicesImages));
            }
            const newImage = req.file.location || req.file.path;
            service.servicesImages = newImage ? newImage.replace(/\\/g, '/') : service.servicesImages;
        }

        service.serviceName = serviceName || service.serviceName;
        service.location = location || service.location;
        service.openingTime = openingTime || service.openingTime;
        service.closingTime = closingTime || service.closingTime;
        service.offDay = offDay || service.offDay;
        service.websiteLink = websiteLink || service.websiteLink;
        service.providings = providings || service.providings;
        service.latitude = latitude || service.latitude;
        service.longitude = longitude || service.longitude;
        service.phone = phone || service.phone;

        await service.save();

        return res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            service
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};

exports.deleteService = asyncHandler(async (req, res, next) => {
    try {
        const ownerId = req.owner.id;
        const owner = await Owner.findById(ownerId);
        const serviceId = req.params.id;
        const service = await Service.findByIdAndUpdate(serviceId);
        if (!service) throw new ApiError('Service not found', 404);
        const business = await Business.findByIdAndUpdate(service.businessId, { $pull: { services: serviceId } });
        if (!business) throw new ApiError('Business not found', 404);
        await service.deleteOne();
        createAdminNotification({
            title: 'A Service has been deleted by ' + owner.name,
            message: `A ${service.serviceName} has been deleted`,
        })
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
    const serviceId = req.params.id;
    try {
        const service = await Service.findById(serviceId);
        if (!service) throw new ApiError('Service not found', 404);
        // const shopLogo = await Business.findById(service.businessId);
        // service.shopLogo = shopLogo;
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