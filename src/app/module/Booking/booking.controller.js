const asyncHandler = require("../../../utils/asyncHandler");
const Booking = require("./Booking");
const { ApiError } = require("../../../errors/errorHandler");
const Service = require("../BusinessServices/Services");
const Business = require("../Business/Business");
const Owner = require("../Owner/Owner");
const Pet = require("../Pet/Pet");
const User = require("../User/User");

exports.createBooking = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const {
    serviceId,
    bookingDate,
    bookingTime,
    bookingStatus,
    notes,
    selectedService,
    businessId,
    petId,
    checkInTime,
    checkOutTime,
    checkInDate,
    checkOutDate,
  } = req.body;
  // if (!serviceId || !bookingDate || !bookingTime || !bookingStatus || !notes || !businessId) throw new ApiError('All fields are required', 400);

  const business = await Business.findById(businessId);
  const service = await Service.findById(serviceId);
  const pet = await Pet.findById(petId);
  if (!pet) throw new ApiError("Pet not found", 404);
  const ownerId = business.ownerId;
  console.log(ownerId);
  const owner = await Owner.findById(ownerId);

  const booking = new Booking({
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
    checkOutDate,
  });
  owner.bookings.push(booking._id); //push the booking id to the owner bookings
  await owner.save();
  service.bookings.push(booking._id);
  await service.save();
  await booking.save();

  const socketService = req.app.get("socketService");
  if (socketService) {
    try {
      await socketService.sendNotification(
        { id: ownerId, role: "OWNER" },
        {
          sender: { id: userId, role: "USER" },
          type: "ACTION_REQUIRED",
          title: "New Booking",
          message: `New booking created by user ${userId}`,
          data: { bookingId: booking._id, serviceId, businessId },
          relatedEntity: { type: "BOOKING", id: booking._id },
        }
      );
      await socketService.sendNotification(
        { id: userId, role: "USER" },
        {
          sender: { id: ownerId, role: "OWNER" },
          type: "SYSTEM",
          title: "Booking Created",
          message: "Your booking has been created successfully.",
          data: { bookingId: booking._id, serviceId, businessId },
          relatedEntity: { type: "BOOKING", id: booking._id },
        }
      );
    } catch (e) {
      console.error("Failed to send booking created notifications:", e);
    }
  }

  res.status(201).json({
    success: true,
    message: "Booking created successfully",
    booking,
  });
});

exports.getBooking = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const totalBookings = await Booking.countDocuments({
    userId: req.user.id || req.user._id,
  });
  const totalPages = Math.ceil(totalBookings / limit);
  const bookings = await Booking.find({ userId: req.user.id || req.user._id })
    .populate(
      "serviceId",
      "serviceType isOpenNow businessId shopLogo location phone servicesImages websiteLink"
    )
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ bookingDate: -1 });

  if (!bookings) throw new ApiError("Bookings not found", 404);

  res.status(200).json({
    success: true,
    message: "Bookings retrieved successfully",
    bookings,
    totalPages,
    totalBookings,
    currentPage: page,
    limit: limit,
  });
});

exports.updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError("Booking not found", 404);
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
    message: "Booking updated successfully",
    booking,
  });
});

exports.deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError("Booking not found", 404);
  const business = await Business.findByIdAndUpdate(booking.businessId, {
    $pull: { bookings: booking._id },
  });
  const owner = await Owner.findByIdAndUpdate(booking.ownerId, {
    $pull: { bookings: booking._id },
  });
  const service = await Service.findByIdAndUpdate(booking.serviceId, {
    $pull: { bookings: booking._id },
  });

  await booking.deleteOne();

  res.status(200).json({
    success: true,
    message: `Booking deleted successfully ${req.params.id}`,
  });
});

exports.getBookingDetails = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate(
    "serviceId",
    "serviceType isOpenNow businessId shopLogo location phone servicesImages websiteLink"
  ); // populate serviceId
  if (!booking) throw new ApiError("Booking not found", 404);
  res.status(200).json({
    success: true,
    message: "Booking details retrieved successfully",
    booking,
  });
});

// User-only: cancel own booking with a reason, notify owner
exports.cancelBookingByUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cancellationReason } = req.body;

  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError("Booking not found", 404);

  // Ensure the requester is the user who made the booking
  if (String(booking.userId) !== String(req.user?.id || req.user?._id)) {
    throw new ApiError("Not authorized to cancel this booking", 403);
  }

  booking.bookingStatus = "CANCELLED";
  booking.cancellationReason = cancellationReason || booking.cancellationReason;
  await booking.save();

  // Notify the owner
  try {
    const socketService = req.app.get("socketService");
    if (socketService) {
      await socketService.sendNotification(
        { id: booking.ownerId, role: "OWNER" },
        {
          sender: { id: booking.userId, role: "USER" },
          type: "SYSTEM",
          title: "Booking Cancelled",
          message: cancellationReason
            ? `User cancelled the booking. Reason: ${cancellationReason}`
            : "User cancelled the booking.",
          data: { bookingId: booking._id, status: "CANCELLED", cancellationReason },
          relatedEntity: { type: "BOOKING", id: booking._id },
        }
      );
    }
  } catch (e) {
    console.error("Failed to send owner cancellation notification:", e);
  }

  res.status(200).json({
    success: true,
    message: "Booking cancelled successfully",
    booking,
  });
});

// Owner-only: update booking status with optional cancellation reason (single endpoint)
exports.updateBookingStatusByOwner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, cancellationReason } = req.body;

  const allowedStatuses = ["APPROVED", "COMPLETED", "CANCELLED"];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError("Invalid status. Use APPROVED, COMPLETED, or CANCELLED", 400);
  }

  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError("Booking not found", 404);

  // Ensure owner is the owner of this booking
  if (String(booking.ownerId) !== String(req.owner?.id || req.user?.id)) {
    throw new ApiError("Not authorized to update this booking", 403);
  }

  booking.bookingStatus = status;
  if (status === "CANCELLED") {
    booking.cancellationReason = cancellationReason || booking.cancellationReason;
  }
  await booking.save();

  // Notify user about status change
  try {
    const socketService = req.app.get("socketService");
    if (socketService) {
      let title = "Booking Updated";
      let message = `Your booking status changed to ${status}.`;
      if (status === "APPROVED") {
        title = "Booking Approved";
        message = "Your booking has been approved.";
      } else if (status === "COMPLETED") {
        title = "Booking Completed";
        message = "Your booking has been completed.";
      } else if (status === "CANCELLED") {
        title = "Booking Cancelled";
        message = cancellationReason
          ? `Your booking was cancelled. Reason: ${cancellationReason}`
          : "Your booking was cancelled.";
      }

      await socketService.sendNotification(
        { id: booking.userId, role: "USER" },
        {
          sender: { id: booking.ownerId, role: "OWNER" },
          type: "SYSTEM",
          title,
          message,
          data: { bookingId: booking._id, status, cancellationReason },
          relatedEntity: { type: "BOOKING", id: booking._id },
        }
      );
    }
  } catch (e) {
    console.error("Failed to send status update notification:", e);
  }

  res.status(200).json({
    success: true,
    message: "Booking status updated",
    booking,
  });
});

// booking.controller.js
exports.requestCancellation = asyncHandler(async (req, res) => {
  const { id } = req.params; // bookingId
  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError("Booking not found", 404);
  if (String(booking.userId) !== String(req.user.id)) {
    throw new ApiError("Not authorized", 403);
  }

  // Optional: store a flag/notes; or you can reuse bookingStatus if you plan a state
  booking.notes = `${booking.notes || ""}\nCancellation requested by user ${
    req.user.id
  }`;
  await booking.save();

  const socketService = req.app.get("socketService");
  await socketService.sendNotification(
    { id: booking.ownerId, role: "OWNER" },
    {
      sender: { id: booking.userId, role: "USER" },
      type: "ACTION_REQUIRED",
      title: "Cancellation Requested",
      message: "User requested booking cancellation.",
      data: { bookingId: booking._id },
      relatedEntity: { type: "BOOKING", id: booking._id },
    }
  );

  res.json({ success: true, message: "Cancellation requested." });
});

exports.approveCancellation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError("Booking not found", 404);

  // Ensure only owner of the booking can approve
  if (String(booking.ownerId) !== String(req.user.id)) {
    throw new ApiError("Not authorized", 403);
  }

  // You can set bookingStatus to REJECTED or add a new enum value like CANCELLED
  booking.bookingStatus = "REJECTED"; // or 'CANCELLED' if you extend enum
  await booking.save();

  const socketService = req.app.get("socketService");
  await socketService.sendNotification(
    { id: booking.userId, role: "USER" },
    {
      sender: { id: booking.ownerId, role: "OWNER" },
      type: "SYSTEM",
      title: "Cancellation Approved",
      message: "Your booking cancellation has been approved.",
      data: { bookingId: booking._id },
      relatedEntity: { type: "BOOKING", id: booking._id },
    }
  );

  res.json({ success: true, message: "Cancellation approved.", booking });
});
