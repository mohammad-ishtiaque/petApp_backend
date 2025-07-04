const Advertisement = require('../../module/Advertisement/Advertisement');
const Service = require('../../module/BusinessServices/Services');
const asyncHandler = require('../../../utils/asyncHandler');

exports.getAllServicesByCategory = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const services = await Service.find({ serviceType: category });
    res.status(200).json({
        success: true,
        message: 'Services fetched successfully',
        services
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

