const asyncHandler = require('../../../utils/asyncHandler');
const Booking = require('./Booking');
const { ApiError } = require('../../../errors/errorHandler');
const Service = require('../BusinessServices/Services');
const Business = require('../Business/Business');
const Owner = require('../Owner/Owner');
const Pet = require('../Pet/Pet');
const User = require('../User/User');

exports.createBooking = asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user._id;
    const { serviceId, bookingDate, bookingTime, bookingStatus, notes, selectedService, businessId, petId, checkInTime, checkOutTime, checkInDate, checkOutDate } = req.body;
    // if (!serviceId || !bookingDate || !bookingTime || !bookingStatus || !notes || !businessId) throw new ApiError('All fields are required', 400);
    
    const business = await Business.findById(businessId);
    const service = await Service.findById(serviceId);
    const pet = await Pet.findById(petId);
    if (!pet) throw new ApiError('Pet not found', 404);
    const ownerId = business.ownerId;
    console.log(ownerId);
    const owner = await Owner.findById(ownerId);

    const booking = new  Booking({
        serviceId,
        userId,
        bookingDate,
        bookingTime,
        bookingStatus,
        notes,
        selectedService,
        serviceType: service?.serviceType,
        businessId,
        ownerId,
        petId,
        checkInTime,
        checkOutTime,
        checkInDate,
        checkOutDate
    });
    owner.bookings.push(booking._id);   //push the booking id to the owner bookings
    await owner.save();
    service.bookings.push(booking._id);
    await service.save();
    await booking.save();

    res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        booking
    });
}); 

exports.getBooking = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 10, limit = 10 } = req.query;
    const totalBookings = await Booking.countDocuments({userId: req.user.id || req.user._id});
    const totalPages = Math.ceil(totalBookings / pageSize);
    const bookings = await Booking.find({userId: req.user.id || req.user._id})
        .populate('serviceId', 'serviceType isOpenNow businessId shopLogo location phone servicesImages') // populate serviceId
        .skip((pageNumber - 1) * pageSize)
        .limit(limit)
        .sort({ bookingDate: -1 }); // sort by bookingDate in descending order

    if (!bookings) throw new ApiError('Bookings not found', 404);

    
    res.status(200).json({
        success: true,
        message: 'Bookings retrieved successfully',
        bookings,
        totalPages,
        totalBookings,
        currentPage: pageNumber,
        pageSize: pageSize,
        limit: limit
    })
});

exports.updateBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new ApiError('Booking not found', 404);
    booking.serviceId = req.body.serviceId || booking.serviceId;
    booking.userId = req.body.userId || booking.userId;
    booking.bookingDate = req.body.bookingDate || booking.bookingDate;
    booking.bookingTime = req.body.bookingTime || booking.bookingTime;
    booking.bookingStatus = req.body.bookingStatus || booking.bookingStatus;
    booking.notes = req.body.notes || booking.notes;
    booking.businessId = req.body.businessId || booking.businessId;
    booking.checkInTime = req.body.checkInTime || booking.checkInTime;
    booking.checkOutTime = req.body.checkOutTime || booking.checkOutTime;
    booking.checkInDate = req.body.checkInDate || booking.checkInDate;
    booking.checkOutDate = req.body.checkOutDate || booking.checkOutDate;
    await booking.save();
    res.status(200).json({
        success: true,
        message: 'Booking updated successfully',
        booking
    });
});

exports.deleteBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new ApiError('Booking not found', 404);
    const business = await Business.findByIdAndUpdate(booking.businessId, { $pull: { bookings: booking._id } });
    const owner = await Owner.findByIdAndUpdate(booking.ownerId, { $pull: { bookings: booking._id } });
    const service = await Service.findByIdAndUpdate(booking.serviceId, { $pull: { bookings: booking._id } });

    await booking.deleteOne();


    res.status(200).json({
        success: true,
        message: `Booking deleted successfully ${req.params.id}`,
    });
});

exports.getBookingDetails = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id)
    .populate('serviceId', 'serviceType isOpenNow businessId shopLogo location phone servicesImages') // populate serviceId
    if (!booking) throw new ApiError('Booking not found', 404);
    res.status(200).json({
        success: true,
        message: 'Booking details retrieved successfully',
        booking
    });
});
