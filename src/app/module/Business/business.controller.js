const Owner = require('../Owner/Owner');
const Business = require('./Business');
const { ApiError } = require('../../../errors/errorHandler');
const { deleteFile } = require('../../../utils/unLinkFiles');
const path = require('path');
const upload = require('../../../utils/upload');



exports.createBusiness = async (req, res, next) => {
    const ownerId = req.owner.id;
    console.log(ownerId);
    // console.log(req.owner.id);
    // console.log(req.files););
    const { businessName, businessType, website, address, moreInfo } = req.body;
    const { shopLogo, shopPic } = req.files;
    try {
        const owner = await Owner.findById(ownerId);
        if (!owner) throw new ApiError('Owner not found', 404);
        const business = new Business({
            ownerId,
            businessName,
            businessType,
            website,
            address,
            moreInfo,
            shopLogo: shopLogo ? shopLogo[0].path : null,
            shopPic: shopPic ? shopPic.map(file => file.path) : []
        });
        await business.save();
        owner.businesses = owner.businesses || [];
        owner.businesses.push(business._id);
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
        const business = await Business.find({ ownerId });
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
    const { shopLogo, shopPic } = req.files;
    try {
        const business = await Business.findById(businessId);
        if (!business) throw new ApiError('Business not found', 404);
        if (shopLogo.length > 0) {
            if (business.shopLogo) {
                await deleteFile(path.join(__dirname, '..', '..', '..', 'uploads', business.shopLogo));
            }
            business.shopLogo = shopLogo[0].path;
        }
        if (shopPic.length > 0) {
            if (business.shopPic) {
                await Promise.all(business.shopPic.map(file => deleteFile(path.join(__dirname, '..', '..', '..', 'uploads', file))));
            }
            business.shopPic = shopPic.map(file => file.path);
        }
        await business.save();
        business.businessName = businessName;
        business.businessType = businessType;
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
    try {
        const business = await Business.findByIdAndDelete(businessId);
        if (!business) throw new ApiError('Business not found', 404);
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