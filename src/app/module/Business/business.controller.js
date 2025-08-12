const Owner = require('../Owner/Owner');
const Business = require('./Business');
const { ApiError } = require('../../../errors/errorHandler');
const { deleteFile } = require('../../../utils/unLinkFiles');
const path = require('path');
const upload = require('../../../utils/upload');
const Booking = require('../Booking/Booking');
const BusinessServices = require('../BusinessServices/Services');
const Review = require('../Review/Review');
const Advertisement = require('../Advertisement/Advertisement');




exports.createBusiness = async (req, res, next) => {
    const ownerId = req.owner.id;
    const { businessName, businessType, website, address, moreInfo } = req.body;
    
    try {
        const owner = await Owner.findById(ownerId);
        if (!owner) throw new ApiError('Owner not found', 404);
        if (owner.businesses) throw new ApiError('An owner can only create a single business', 400);
        // console.log(owner);
        // Handle file uploads
        const shopLogo = req.files && req.files['shopLogo'] ? req.files['shopLogo'][0].path : null;
        const shopPics = req.files && req.files['shopPic'] 
            ? req.files['shopPic'].map(file => file.path) 
            : [];

        const business = new Business({
            ownerId,
            businessName,
            website,
            address,
            moreInfo,
            shopLogo: shopLogo ? shopLogo.replace(/\\/g, '/') : null,
            shopPic: shopPics.map(pic => pic.replace(/\\/g, '/'))
        });

        await business.save();
        owner.businesses = [business._id];
        await owner.save();
        
        return res.status(201).json({
            success: true,
            message: 'Business created successfully',
            business
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};


exports.getBusiness = async (req, res, next) => {
    const ownerId = req.owner.id;
    try {
        const business = await Business.findOne({ ownerId });
        if (!business) throw new ApiError('Business not found', 404);
        
        const serviceIds = business.services;
        const businessServices = await BusinessServices.find({ _id: { $in: serviceIds } });
        const servicesType = businessServices.map(service => service.serviceType);
        // console.log(servicesType);
        business.servicesType = servicesType;
        
        
        await business.save();

        return res.status(200).json({
            success: true,
            message: 'Business fetched successfully',
            business
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};


exports.getBusinessById = async (req, res, next) => {
    const businessId = req.params.id;
    try {
        const business = await Business.findById(businessId);
        if (!business) throw new ApiError('Business not found', 404);
        return res.status(200).json({
            success: true,
            message: 'Business fetched successfully',
            business
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};


exports.updateBusiness = async (req, res, next) => {
    const businessId = req.params.id;
    const { businessName, businessType, website, address, moreInfo } = req.body;
    
    try {
        const business = await Business.findById(businessId);
        if (!business) throw new ApiError('Business not found', 404);
        
        // Handle shopLogo update
        if (req.files && req.files['shopLogo']) {
            // Delete old logo if it exists
            if (business.shopLogo) {
                await deleteFile(path.join(__dirname, '..', '..', '..', business.shopLogo));
            }
            // Update with new logo path (normalize path)
            business.shopLogo = req.files['shopLogo'][0].path.replace(/\\/g, '/');
        }
        
        // Handle shopPic update
        if (req.files && req.files['shopPic']) {
            // Delete old shop pictures if they exist
            if (business.shopPic && business.shopPic.length > 0) {
                await Promise.all(
                    business.shopPic.map(file => 
                        deleteFile(path.join(__dirname, '..', '..', '..', file))
                    )
                );
            }
            // Add new shop pictures (normalize paths)
            business.shopPic = req.files['shopPic'].map(file => file.path.replace(/\\/g, '/'));
        }
        await business.save();
        business.businessName = businessName;
        business.website = website; 
        business.address = address;
        business.moreInfo = moreInfo;
        await business.save();
        return res.status(200).json({
            success: true,
            message: 'Business updated successfully',
            business
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};

exports.deleteBusiness = async (req, res, next) => {
    const businessId = req.params.id;
    const ownerId = req.owner.id || req.owner._id;
    try {
        const business = await Business.findByIdAndDelete(businessId);
        if (!business) throw new ApiError('Business not found', 404);
        
        await Owner.findByIdAndUpdate(ownerId, { $unset: { businesses: businessId } });
        await Booking.deleteMany({ businessId });
        await BusinessServices.deleteMany({ businessId });
        await Review.deleteMany({ businessId });
        await Advertisement.deleteMany({ businessId });
        return res.status(200).json({
            success: true,
            message: 'Business deleted successfully',
            business
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};

//for admin only
exports.getAllBusiness = async (req, res, next) => {
    try {
        const business = await Business.find();
        if (!business) throw new ApiError('Business not found', 404);     
        return res.status(200).json({
            success: true,
            message: 'Business fetched successfully',
            business
        });
    } catch (err) {
        throw new ApiError(err.message, 500);   
    }
};

exports.addAdvertisement = async (req, res, next) => {
    const ownerId = req.owner.id;
    const business = await Business.findOne({ ownerId });
    const businessId = business._id;

    try {
        const advertisementImg = req.files;
        const business = await Business.findById(businessId);
        // console.log(business);
        if (!business) throw new ApiError('Business not found', 404);
        business.advertisementImg = advertisementImg ? advertisementImg.map(file => file.path) : []
        await business.save();
        return res.status(200).json({
            success: true,
            message: 'advertisement added successfully',
            business
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};


exports.deleteAdvertisement = async (req, res, next) => {
    const ownerId = req.owner.id;
    const business = await Business.findOne({ ownerId });
    const businessId = business._id;
    try {
        const business = await Business.findById(businessId);
        if (!business) throw new ApiError('Business not found', 404);
        business.advertisementImg = [];
        await business.save();
        return res.status(200).json({
            success: true,
            message: 'advertisement deleted successfully',
            business
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};