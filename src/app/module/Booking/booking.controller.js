const asyncHandler = require('../../../utils/asyncHandler');
const Booking = require('./Booking');
const { ApiError } = require('../../../errors/errorHandler');

exports.createBooking = asyncHandler(async (req, res) => {
    const userId = req.user.id || req.params.userId;
    const { serviceId, bookingDate, bookingTime, bookingStatus, notes, businessId } = req.body;
    if (!serviceId || !bookingDate || !bookingTime || !bookingStatus || !notes || !businessId) throw new ApiError('All fields are required', 400);
    const booking = await Booking.create({
        serviceId,
        userId,
        bookingDate,
        bookingTime,
        bookingStatus,
        notes,
        businessId
    });

    res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        booking
    });
}); 

exports.getBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) throw new ApiError('Booking not found', 404);
    res.status(200).json({
        success: true,
        message: 'Booking retrieved successfully',
        booking
    });
});

exports.updateBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) throw new ApiError('Booking not found', 404);
    booking.serviceId = req.body.serviceId || booking.serviceId;
    booking.userId = req.body.userId || booking.userId;
    booking.bookingDate = req.body.bookingDate || booking.bookingDate;
    booking.bookingTime = req.body.bookingTime || booking.bookingTime;
    booking.bookingStatus = req.body.bookingStatus || booking.bookingStatus;
    booking.notes = req.body.notes || booking.notes;
    booking.businessId = req.body.businessId || booking.businessId;
    await booking.save();
    res.status(200).json({
        success: true,
        message: 'Booking updated successfully',
        booking
    });
});

exports.deleteBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) throw new ApiError('Booking not found', 404);
    await booking.deleteOne();
    res.status(200).json({
        success: true,
        message: 'Booking deleted successfully',
    });
});
