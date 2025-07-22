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

