const Service   = require('../BusinessServices/Services');
const Business = require('../Business/Business');
const Owner = require('../Owner/Owner');
const Pet = require('../Pet/Pet');
const User = require('../User/User');
const Review = require('../Review/Review');
const Booking = require('../Booking/Booking');
const Advertisement = require('../Advertisement/Advertisement');
const asyncHandler = require('../../../utils/asyncHandler');
const { ApiError } = require('../../../errors/errorHandler');

exports.getServiceByType = asyncHandler(async (req, res) => {
    const type = req.params.type;
    console.log(type);
    const services = await Service.find({ serviceType: type.toUpperCase() });
    console.log(services);
    if (!services.length) throw new ApiError('Services not found', 404);
    res.status(200).json({
        success: true,
        message: 'Services fetched successfully',
        services
    });
});

