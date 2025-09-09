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

  // Fetch services with pagination
  const services = await Service.find({ serviceType: type.toUpperCase() })
    .skip(startIndex)
    .limit(limit)
    .lean()
    .populate("reviews", "comment rating");

    if (!services.length) throw new ApiError('Services not found', 404);
  // Calculate average rating and isOpenNow
  const servicesWithStatus = services.map(service => {
    const ratings = service.reviews?.map(r => r.rating);
    const avgRating = ratings?.length
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    return {
      ...service,
      isOpenNow: checkIfOpenNow(service),
      avgRating: parseFloat(avgRating.toFixed(1)) // rounded to 1 decimal
    };
  });

  // Total count for pagination
  const total = await Service.countDocuments({ serviceType: type.toUpperCase() });

  res.status(200).json({
    success: true,
    message: services.length ? "Services fetched successfully" : "Services not found",
    services: servicesWithStatus,
    currentPage: page,
    pageSize: limit,
    total,
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
        petPhoto: pet.petPhoto,
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


exports.getAllUserHomePageData = asyncHandler(async (req, res) => {
  const type = req.query.type;
  const userId = req.user.id; 

  // Get services with reviews
  let servicesQuery = Service.find({ isActive: true });
  if (type) {
      servicesQuery = servicesQuery.where('serviceType').equals(type.toUpperCase());
  }
  
  const services = await servicesQuery
      .populate({
          path: 'reviews',
          select: 'comment rating',
          options: { sort: { createdAt: -1 } }
      })
      .select('-_id -__v -createdAt -updatedAt')
      .lean();

  // Get user's pets
  const totalPets = await Pet.countDocuments({ userId });
  const pets = await Pet.find({ userId })
      .select('_id name petPhoto')
      .lean();

  // Get active advertisements
  const ads = await Advertisement.find({ status: 'ACTIVE' })
      .select('_id advertisementImg')
      .lean();

  // Get ad details if ad ID is provided
  const adsId = req.query.id;
  const adsDetails = adsId 
      ? await Advertisement.findOne({ 
          _id: adsId, 
          status: 'ACTIVE' 
        })
          .populate('businessId', 'shopLogo location servicesImages websiteLink')
          .lean()
      : null;

  // Get upcoming appointments for the user
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day

  const upcomingAppointments = await Booking.find({
      userId,
      $or: [
          { 
              checkInDate: { $gte: today }, // For hotel bookings
              bookingStatus: { $in: ['PENDING', 'APPROVED'] }
          },
          { 
              bookingDate: { $gte: today }, // For regular appointments
              bookingStatus: { $in: ['PENDING', 'APPROVED'] }
          }
      ]
  })
  .sort({
      checkInDate: 1,  // Sort by check-in date first (for hotels)
      bookingDate: 1,  // Then by booking date
      bookingTime: 1   // Then by booking time
  })
  .limit(5) // Limit to 5 upcoming appointments
  .populate('serviceId', 'serviceName serviceType shopLogo')
  .lean();

  // Transform appointments data
  const transformedAppointments = upcomingAppointments.map(appointment => {
      const isHotelBooking = appointment.serviceId?.serviceType === 'HOTEL';
      const date = isHotelBooking ? appointment.checkInDate : appointment.bookingDate;
      const time = isHotelBooking ? appointment.checkInTime : appointment.bookingTime;
      
      return {
          id: appointment._id,
          service: {
              id: appointment.serviceId?._id,
              name: appointment.serviceId?.serviceName || 'Service not available',
              type: appointment.serviceId?.serviceType,
              image: appointment.serviceId?.shopLogo
          },
          date: date,
          time: time,
          status: appointment.bookingStatus,
          isHotelBooking,
          ...(isHotelBooking && {
              checkInDate: appointment.checkInDate,
              checkOutDate: appointment.checkOutDate,
              checkInTime: appointment.checkInTime,
              checkOutTime: appointment.checkOutTime
          }),
          notes: appointment.notes
      };
  });

  // Transform services data (existing code)
  const transformedServices = services.map(service => {
      const avgRating = service.reviews?.length 
          ? (service.reviews.reduce((sum, r) => sum + r.rating, 0) / service.reviews.length).toFixed(1)
          : 0;

      return {
          id: service._id,
          type: service.serviceType,
          name: service.serviceName,
          location: service.location,
          contact: {
              phone: service.phone,
              website: service.websiteLink
          },
          hours: {
              opening: service.openingTime,
              closing: service.closingTime,
              offDay: service.offDay,
              isOpenNow: checkIfOpenNow(service)
          },
          images: {
              logo: service.shopLogo,
              gallery: service.servicesImages ? [service.servicesImages] : []
          },
          services: service.providings,
          stats: {
              totalBookings: service.bookings?.length || 0,
              totalReviews: service.reviews?.length || 0,
              averageRating: parseFloat(avgRating)
          },
          reviews: service.reviews?.slice(0, 3) || []
      };
  });

  // Transform pets data (existing code)
  const transformedPets = pets.map(pet => ({
      id: pet._id,
      name: pet.name,
      photo: pet.petPhoto
  }));

  // Transform ads data (existing code)
  const transformedAds = ads.map(ad => ({
      id: ad._id,
      images: ad.advertisementImg
  }));

  // Transform ad details if exists (existing code)
  let transformedAdDetails = null;
  if (adsDetails) {
      transformedAdDetails = {
          id: adsDetails._id,
          images: adsDetails.advertisementImg,
          business: adsDetails.businessId ? {
              logo: adsDetails.businessId.shopLogo,
              location: adsDetails.businessId.location,
              images: adsDetails.businessId.servicesImages,
              website: adsDetails.businessId.websiteLink
          } : null
      };
  }

  res.status(200).json({
      success: true,
      message: 'All user home page data fetched successfully',
      data: {
          services: transformedServices,
          appointments: transformedAppointments, // Add appointments to response
          pets: {
              total: totalPets,
              list: transformedPets
          },
          advertisements: {
              featured: transformedAds,
              details: transformedAdDetails
          }
      }
  });
});