const Service = require('./Services');
const Business = require('../Business/Business');
const { ApiError } = require('../../../errors/errorHandler');

// const ApiError = require('../../../utils/ApiError');

exports.createService = async (req, res, next) => {
    try {
        const ownerId = req.owner.id;
        // console.log(ownerId);
        const business = await Business.findOne({ ownerId });
        const businessId = business._id;

       
        const servicesImages = req.files ? req.files.map(file => file.path) : [];
        const { serviceType, serviceName, location, openingTime, closingTime, offDay, websiteLink } = req.body;
        const service = new Service({
            serviceType,
            serviceName,
            location,
            openingTime,
            closingTime,
            offDay,
            websiteLink,
            servicesImages,
            businessId
        });
        await service.save();
        return res.status(201).json({
            success: true,
            message: 'Service created successfully',
            service
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};


exports.getAllServices = async (req, res, next) => {
    const ownerId = req.owner.id;
    const business = await Business.findOne({ ownerId });
    const businessId = business._id;
    try {
        const services = await Service.find({ businessId });
        // console.log(businessDetails);
        if (!services) throw new ApiError('Services not found', 404);
        return res.status(200).json({
            success: true,
            message: 'Services fetched successfully',
            services
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};

exports.updateService = async (req, res, next) => {
    try {
        const service = await Service.findByIdAndUpdate(req.params.serviceId, req.body, { new: true });
        if (!service) throw new ApiError('Service not found', 404);
        res.status(200).json({
            success: true,
            message: 'Service updated successfully',
            service
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};

exports.deleteService = async (req, res, next) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.serviceId);
        if (!service) throw new ApiError('Service not found', 404);
        res.status(200).json({
            success: true,
            message: 'Service deleted successfully',
            service
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};

exports.getServicesById = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) throw new ApiError('Service not found', 404);
        res.status(200).json({
            success: true,
            message: 'Service fetched successfully',
            service
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};




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