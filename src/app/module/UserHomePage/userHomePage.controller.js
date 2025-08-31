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
const checkIfOpenNow = require('../../../utils/checkOpen');

exports.getServicesByType = asyncHandler(async (req, res) => {
    const type = req.params.type;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const services = await Service.find({ serviceType: type.toUpperCase() })
      .skip(startIndex)
      .limit(limit)
      .lean()
      .populate('reviews', 'comment rating');

    if (!services.length) {
      return res.status(200).json({
        success: true,
        message: "Services not found",
        data: []
      });
    }
  
    const servicesWithStatus = services.map(service => ({
      ...service,
      isOpenNow: checkIfOpenNow(service),
    }));
  
    res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      services: servicesWithStatus,
      currentPage: page,
      pageSize: limit,
      total: await Service.countDocuments({ serviceType: type.toUpperCase() })
    });
  });


exports.totalPetsForLoggedInUser = asyncHandler(async (req, res) => {
    const totalPets = await Pet.countDocuments({ userId: req.user.id });
    if (!totalPets) throw new ApiError('Pets not found', 404);
    const pets = await Pet.find({ userId: req.user.id });
    if (!pets.length) throw new ApiError('Pets not found', 404);   
    // console.log(pets);
    const petList = pets.map(pet => ({
        _id: pet._id,
        petPhoto: pet.petPhoto[0] || '',
        name: pet.name
    }));

    const user = await User.findById(req.user.id);
    const userPic = user.profilePic;
    //  console.log(petList);

    res.status(200).json({
        success: true,
        message: 'Total pets for logged in user fetched successfully',
        data: {
            totalPets,
            petList,
            userPic
        }
    });
});

exports.allAdsWhichActive = asyncHandler(async (req, res) => {
    const ads = await Advertisement.find({ status: 'ACTIVE' });
    if (!ads.length) throw new ApiError('Ads not found', 404);
    const adsPic = ads.map( ad => ad.advertisementImg);
    res.status(200).json({
        success: true,
        message: 'Ads fetched successfully',
        data:{
            adsPic,
            ads
        }
    });
});

exports.getActiveAdsDetails = asyncHandler(async (req, res) => {
    const adsId = req.params.id;
    const ads = await Advertisement.findOne({ status: 'ACTIVE', _id: adsId });
    if (!ads) throw new ApiError('Ads not found', 404);
    const business = await Business.findById(ads.businessId);
    if (!business) throw new ApiError('Business not found', 404);
    const services = await Service.find({ businessId: ads.businessId });
    if (!services.length) throw new ApiError('Services not found', 404);
    res.status(200).json({
        success: true,
        message: 'Ads fetched successfully',
        ads,
        business,
        services
    });
});
