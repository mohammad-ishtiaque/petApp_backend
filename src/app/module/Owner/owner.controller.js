const Owner = require('./Owner');
const { ApiError } = require('../../../errors/errorHandler');
const { deleteFile } = require('../../../utils/unLinkFiles');
const path = require('path');
const upload = require('../../../utils/upload');
const asyncHnadler = require('../../../utils/asyncHandler');
const Business = require('../Business/Business');
const Service = require('../BusinessServices/Services');
const Booking = require('../Booking/Booking');
const asyncHandler = require('../../../utils/asyncHandler');
const Pet = require('../Pet/Pet')

exports.getOwnerDetails = asyncHnadler(async (req, res, next) => {
  const id = req.owner.id || req.owner._id;
  // console.log(id);
  const owner = await Owner.findById(id).select('-password');
  // console.log(owner);
  if (!owner) {
    return next(new ApiError('Owner not found', 404));
  }
  res.status(200).json({
    success: true,
    message: 'Owner fetched successfully',
    owner
  });
});


exports.updateOwnerDetails = asyncHnadler(async (req, res, next) => {

  const id = req.owner.id || req.owner._id;

  const owner = await Owner.findById(id);
  if (!owner) {
    return next(new ApiError('Owner not found', 404));
  }
  owner.name = req.body.name;
  owner.email = req.body.email;
  owner.phone = req.body.phone;
  owner.address = req.body.address;
  owner.city = req.body.city;
  owner.state = req.body.state;
  owner.zipCode = req.body.zipCode;
  owner.country = req.body.country;
  if (req.file) {
    owner.ownerPic = req.file.path; // upload the new image
    await deleteFile(owner.ownerPic); // delete the old image 
  }
  if (req.body.password) {
    owner.password = req.body.password;
  }
  await owner.save();
  res.status(200).json({
    success: true,
    message: 'Owner updated successfully',
    owner
  });
});

exports.deleteOwner = asyncHnadler(async (req, res, next) => {
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


exports.getOwnerBusinesses = asyncHnadler(async (req, res, next) => {
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

  const owner = await Owner.findById(ownerId).populate('bookings'); // automatically gets booking data

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


exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const  bookingId  = req.params._id || req.params.id;
  const { status } = req.body;

  const validStatuses = ['PENDING', 'COMPLETED', 'REJECTED', 'APPROVED'];
 
  if (!validStatuses.includes(status)) {
    throw new ApiError(`Invalid booking status. Allowed: ${validStatuses.join(', ')}`, 400);
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  booking.bookingStatus = status;
  await booking.save();

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
