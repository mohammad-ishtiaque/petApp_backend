const Owner = require('./Owner');
const { ApiError } = require('../../../errors/errorHandler');
const { deleteFile } = require('../../../utils/unLinkFiles');
const path = require('path');
const upload = require('../../../utils/upload');
const Business = require('../Business/Business');
const Service = require('../BusinessServices/Services');
const Booking = require('../Booking/Booking');
const asyncHandler = require('../../../utils/asyncHandler');
const Pet = require('../Pet/Pet')


exports.getOwnerDetails = asyncHandler(async (req, res, next) => {
  const id = req.owner.id || req.owner._id;

  const owner = await Owner.findById(id).select('-password');
  if (!owner) {
    return next(new ApiError('Owner not found', 404));
  }

  const business = await Business.findOne({ ownerId: id });
  const ownerDetails = {
    ...owner.toObject(),
    business
  };

  res.status(200).json({
    success: true,
    message: 'Owner fetched successfully',
    ownerDetails
  });
});


exports.updateOwnerProfile = async (req, res, next) => {
  const ownerId = req.owner.id || req.owner._id;
  const { name, address, phone } = req.body;

  try {
    const owner = await Owner.findById(ownerId).select('-password');
    if (!owner) throw new ApiError('Owner not found', 404);

    // Handle profilePic update
    if (req.file) {
      // Delete old profile picture if it exists
      if (owner.profilePic) {
        await deleteFile(path.join(__dirname, '..', '..', '..', owner.profilePic));
      }
      // Update with new profile picture path (normalize path)
      owner.profilePic = req.file.path.replace(/\\/g, '/');
    }

    owner.name = name || owner.name;
    owner.address = address || owner.address;
    owner.phone = phone || owner.phone;
    await owner.save();
    return res.status(200).json({
      success: true,
      message: 'Owner profile updated successfully',
      owner
    });
  } catch (err) {
    throw new ApiError(err.message, 500);
  }
};

exports.deleteOwner = asyncHandler(async (req, res, next) => {
  const id = req.owner.id || req.owner._id;
  const owner = await Owner.findByIdAndDelete(id);
  const businesses = await Business.find({ ownerId: id });
  for (const business of businesses) {
    await Business.findByIdAndDelete(business._id);
  }
  if (!owner) {
    return next(new ApiError('Owner not found', 404));
  }
  res.status(200).json({
    success: true,
    message: 'Owner deleted successfully',
    owner
  });
});


exports.getOwnerBusinesses = asyncHandler(async (req, res, next) => {
  const id = req.owner.id || req.owner._id;
  const businesses = await Business.find({ ownerId: id });
  const services = await Service.find({ businessId: { $in: businesses.map(business => business._id) } });

  res.status(200).json({
    success: true,
    message: 'Businesses fetched successfully',
    services,
    businesses
  });
});


//when owner logged in. we will get the owner id. 
//if we push the booking id int the owner section they will see those. 
exports.getAllBookingsByOwner = asyncHandler(async (req, res, next) => {
  const ownerId = req.owner.id || req.owner._id;

  const owner = await Owner.findById(ownerId).populate({
    path: 'bookings',
    options: { sort: { createdAt: -1 } }
  }); // sort most recent first

  if (!owner || !owner.bookings || owner.bookings.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No bookings found for this owner',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Bookings fetched successfully',
    bookings: owner.bookings, // no circular structure now
  });
});



exports.getBookingsByOwnerWithStatusAndPagination = asyncHandler(async (req, res, next) => {
  const ownerId = req.owner.id || req.owner._id;
  const { status, page = 1, limit = 10 } = req.query;

  const validStatuses = ['PENDING', 'COMPLETED', 'REJECTED', 'APPROVED', 'CANCELLED'];
  if (status && !validStatuses.includes(status)) {
    throw new ApiError(`Invalid booking status. Allowed: ${validStatuses.join(', ')}`, 400);
  }

  const totalBookings = await Booking.countDocuments({ ownerId, bookingStatus: status || { $exists: true } });
  const totalPages = Math.ceil(totalBookings / limit);
  const bookings = await Booking.find({ ownerId, bookingStatus: status || { $exists: true } })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate(
      "serviceId",
      "serviceType isOpenNow businessId shopLogo location phone servicesImages websiteLink"
    )
    .select('-__v');

  res.status(200).json({
    success: true,
    message: 'Bookings fetched successfully',
    bookings,
    totalPages,
    totalBookings,
    currentPage: Number(page),
    limit: Number(limit),
  });
});



exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const bookingId = req.params._id || req.params.id;
  const { status, cancellationReason } = req.body;

  const validStatuses = ['APPROVED', 'COMPLETED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(`Invalid booking status. Allowed: ${validStatuses.join(', ')}`, 400);
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  // Ensure the authenticated owner owns this booking
  const requesterOwnerId = req.owner?.id || req.owner?._id;
  if (String(booking.ownerId) !== String(requesterOwnerId)) {
    throw new ApiError('Not authorized to update this booking', 403);
  }

  booking.bookingStatus = status;
  if (status === 'REJECTED') {
    booking.cancellationReason = cancellationReason || booking.cancellationReason;
  }
  await booking.save();

  // Notify the user about the status change
  try {
    const socketService = req.app.get('socketService');
    if (socketService) {
      let title = 'Booking Updated';
      let message = `Your booking status changed to ${status}.`;
      if (status === 'APPROVED') {
        title = 'Booking Approved';
        message = 'Your booking has been approved.';
      } else if (status === 'COMPLETED') {
        title = 'Booking Completed';
        message = 'Your booking has been completed.';
      } else if (status === 'REJECTED') {
        title = 'Booking REJECTED';
        message = cancellationReason ? `Your booking was REJECTED. Reason: ${cancellationReason}` : 'Your booking was REJECTED.';
      }

      await socketService.sendNotification(
        { id: booking.userId, role: 'USER' },
        {
          sender: { id: booking.ownerId, role: 'OWNER' },
          type: 'SYSTEM',
          title,
          message,
          data: { bookingId: booking._id, status, cancellationReason },
          relatedEntity: { type: 'BOOKING', id: booking._id }
        }
      );
    }
  } catch (err) {
    console.error('Failed to send status update notification:', err);
  }

  res.status(200).json({
    success: true,
    message: `Booking status updated to ${status}`,
    booking
  });
});

exports.getBookingsByServiceType = asyncHandler(async (req, res) => {
  const  {type}  = req.body;
  const validTypes = ['VET', 'SHOP', 'HOTEL', 'TRAINING', 'FRIENDLY', 'GROOMING'];

  if (!validTypes.includes(type.toUpperCase())) {
    throw new ApiError(`Invalid service type. Use one of: ${validTypes.join(', ')}`, 400);
  }

  const bookings = await Booking.find({ serviceType: type.toUpperCase() });

  res.status(200).json({
    success: true,
    message: `Bookings with serviceType ${type.toUpperCase()} fetched successfully`,
    count: bookings.length,
    bookings
  });
});


exports.getBookedPetsByOwner = async (req, res, next) => {
  try {
    const  ownerId  = req.params.id || req.params._id;

    // 1. Get all services under this owner
    const services = await Service.find({ ownerId });
    const serviceIds = services.map(service => service._id);

    // 2. Get all bookings for those services
    const bookings = await Booking.find({ serviceId: { $in: serviceIds } });
    const userIds = [...new Set(bookings.map(b => b.userId.toString()))];

    // 3. Get all pets under those users
    const pets = await Pet.find({ userId: { $in: userIds } });

    res.status(200).json({
      success: true,
      totalPets: pets.length,
      pets
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message
    });
  }
};

exports.gtPetDetailsByPetId = asyncHandler(async (req, res) => {
  const petId = req.params.id || req.params._id;
  const pet = await Pet.findById(petId);
  if (!pet) {
    throw new ApiError('Pet not found', 404);
  }
  res.status(200).json({
    success: true,
    message: 'Pet fetched successfully',
    pet
  });
});

exports.getOwnerReviewsWithAvg = async (req, res, next) => {
  try {
    const ownerId = req.params.id || req.params._id;

    // Find all services for this owner
    const services = await Service.find({ ownerId }).select('_id name');
    const serviceIds = services.map(s => s._id);

    // For each service, get its reviews and calculate avg rating
    const serviceReviews = await Promise.all(
      services.map(async (service) => {
        // Find bookings for this service that have reviews
        const bookingsWithReviews = await Booking.find({
          serviceId: service._id,
          review: { $exists: true, $ne: null }
        }).select('review rating userId');

        // Collect reviews and ratings
        const reviews = bookingsWithReviews.map(b => ({
          review: b.review,
          rating: b.rating,
          userId: b.userId
        }));

        // Calculate average rating for this service
        const ratings = bookingsWithReviews.map(b => b.rating).filter(r => typeof r === 'number');
        const avgRating = ratings.length
          ? (ratings.reduce((acc, val) => acc + val, 0) / ratings.length).toFixed(2)
          : null;

        return {
          serviceId: service._id,
          serviceName: service.name,
          totalReviews: reviews.length,
          avgRating: avgRating ? Number(avgRating) : null,
          reviews
        };
      })
    );

    res.status(200).json({
      success: true,
      services: serviceReviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message
    });
  }
};
