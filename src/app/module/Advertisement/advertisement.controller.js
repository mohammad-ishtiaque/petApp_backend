const Advertisement = require('./Advertisement');
const { ApiError } = require('../../../errors/errorHandler');
const { deleteFile } = require('../../../utils/unLinkFiles');
const path = require('path');
const upload = require('../../../utils/upload');
const Business = require('../Business/Business');


exports.createAdvertisement = async (req, res, next) => {

    try {
        const ownerId = req.owner.id;
        const business = await Business.findOne({ ownerId });
        const businessId = business._id;
        const advertisementImg = req.files;

        const advertisement = new Advertisement({
            advertisementImg: advertisementImg ? advertisementImg.map(file => file.path) : [],
            businessId,
            ownerId
        });
        await advertisement.save();
        return res.status(201).json({
            success: true,
            message: 'Advertisement created successfully',
            advertisement
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};

//it will get all the ads which is comes from one single owner
exports.getAdvertisement = async (req, res, next) => {
    const ownerId = req.owner.id;
    try {
        const advertisement = await Advertisement.find({ ownerId });
        if (advertisement.length === 0) throw new ApiError('Advertisement not found', 404);
        res.status(200).json({
            success: true,
            message: 'Advertisement fetched successfully',
            advertisement
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
}   



exports.deleteAdvertisement = async (req, res, next) => {
    const advertisementId = req.params.id;
    try {
        const advertisement = await Advertisement.findByIdAndDelete(advertisementId);
        if (!advertisement) throw new ApiError('Advertisement not found', 404);
        if (advertisement.advertisementImg.length > 0) {
            await Promise.all(advertisement.advertisementImg.map(file => deleteFile(path.join(__dirname, '..', '..', '..', 'uploads', file))));
        }
        return res.status(200).json({
            success: true,
            message: 'Advertisement deleted successfully',
            advertisement
        });
    } catch (err) {
        throw new ApiError(err.message, 500);
    }
};

