const Owner = require('../Owner/Owner');
const Business = require('./Business');
const {ApiError} = require('../../../errors/errorHandler');

exports.createBusiness = async (req, res, next) => {
    const ownerId = req.owner.id;
    console.log(ownerId);
    // console.log(req.owner.id);
    // console.log(req.files););
    const {  businessName, businessType, website, address, moreInfo } = req.body;
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
        return res.status(201).json({
            success: true,
            message: 'Business created successfully',
            business
        });
    } catch (err) {
        throw new ApiError(err.message, 500);    
    }
};

