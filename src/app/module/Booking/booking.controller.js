const asyncHandler = require("../../../utils/asyncHandler");
const Booking = require("./Booking");
const { ApiError } = require("../../../errors/errorHandler");
const Service = require("../BusinessServices/Services");
const Business = require("../Business/Business");
const Owner = require("../Owner/Owner");
const Pet = require("../Pet/Pet");
const User = require("../User/User");
const QueryBuilder = require("../../../builder/queryBuilder");
const {getWeekdayName} = require("../../../utils/checkDate");

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

  const day = getWeekdayName(bookingDate);
  
  const business = await Business.findById(businessId);
  const service = await Service.findById(serviceId);
  if(day === service.offDay){
    return res.status(404).json({
      success: false,
      message: `Booking is not allowed on ${day}`,
    });
  }
  // console.log("service", service)
  const pet = await Pet.findById(petId);
  if (!pet) throw new ApiError("Pet not found", 404);
  const ownerId = business.ownerId;
  // console.log(ownerId);
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
  const query = { userId: req.user.id || req.user._id };
  const queryObj = { ...req.query };
  
  // Create query builder instance
  const bookingQuery = new QueryBuilder(Booking.find(query), queryObj)
    .search(['bookingStatus', 'notes']) // Add searchable fields if needed
    .filter()
    .sort()
    .paginate()
    .fields();

  // Execute query and get pagination info
  const bookings = await bookingQuery.modelQuery.populate(
    "serviceId",
    "serviceType isOpenNow businessId shopLogo location phone servicesImages websiteLink"
  );
  
  const { page, limit, total, totalPage } = await bookingQuery.countTotal();

  if (!bookings || bookings.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No bookings found",
      bookings: [],
      pagination: {
        total,
        totalPage,
        currentPage: page,
        limit,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: "Bookings retrieved successfully",
    bookings,
    pagination: {
      total,
      totalPage,
      currentPage: page,
      limit,
    },
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


/**
 * Get booking overview for an owner, with optional service filter and stats for weekly/monthly bookings.
 * Query params:
 *   - serviceId (optional): filter bookings by a specific service
 *   - status (optional): filter by bookingStatus (e.g., "COMPLETED", "PENDING")
 */
exports.getOwnerBookingOverview = asyncHandler(async (req, res) => {
  const ownerId = req.owner.id || req.owner._id;
  const { serviceId, status, month, year, weekStart, week, weekYear } = req.query;

  // 1. Find all services for this owner
  // Service documents are linked to Business via businessId, and Business has ownerId
  let services = [];
  if (serviceId) {
    services = await Service.find({ _id: serviceId }).select('_id name');
  } else {
    const businesses = await Business.find({ ownerId }).select('_id');
    const businessIds = businesses.map(b => b._id);
    if (businessIds.length === 0) {
      return res.status(200).json({
        success: true,
        services: [],
        totalBookings: 0,
        bookings: [],
        stats: { weekly: { total: 0, completed: 0 }, monthly: { total: 0, completed: 0 } }
      });
    }
    services = await Service.find({ businessId: { $in: businessIds } }).select('_id name');
  }
  const serviceIds = services.map(s => s._id);

  // 2. Build booking query
  const bookingQuery = { serviceId: { $in: serviceIds } };
  if (status) {
    const normalizedStatus = String(status).toUpperCase();
    bookingQuery.bookingStatus = normalizedStatus;
  }

  // 3. Get all bookings for these services
  const bookings = await Booking.find(bookingQuery)
    .populate('userId', 'name email')
    .populate('petId', 'name type')
    .populate('serviceId', 'name')
    .sort({ bookingDate: -1, bookingTime: -1 });


  // 4. Calculate stats
  const now = new Date();

  // Compute week range (defaults to current week Sunday-Sunday)
  let startOfWeek;
  if (weekStart) {
    const ws = new Date(weekStart);
    if (!isNaN(ws)) {
      startOfWeek = new Date(ws);
      startOfWeek.setHours(0, 0, 0, 0);
    }
  }
  if (!startOfWeek && week) {
    // Derive from week number (1-based) and optional weekYear (defaults to current year)
    const y = Number(weekYear) || now.getFullYear();
    const w = Math.max(1, Number(week));
    const jan1 = new Date(y, 0, 1);
    const jan1Day = jan1.getDay(); // 0 = Sunday
    const firstWeekStart = new Date(jan1);
    firstWeekStart.setDate(jan1.getDate() - jan1Day); // back to Sunday of the first week grid
    startOfWeek = new Date(firstWeekStart);
    startOfWeek.setDate(firstWeekStart.getDate() + (w - 1) * 7);
    startOfWeek.setHours(0, 0, 0, 0);
  }
  if (!startOfWeek) {
    startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
  }
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  // Compute month range (defaults to current month)
  let startOfMonth;
  let endOfMonth;
  const m = Number(month);
  const y = Number(year);
  if (!isNaN(m) && m >= 1 && m <= 12) {
    const useYear = !isNaN(y) ? y : now.getFullYear();
    startOfMonth = new Date(useYear, m - 1, 1);
    endOfMonth = new Date(useYear, m, 1);
  } else {
    startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  // Helper to check if a booking is in a date range
  function isInRange(date, start, end) {
    return date >= start && date < end;
  }

  let weeklyIn = 0, weeklyCompleted = 0, monthlyIn = 0, monthlyCompleted = 0;
  bookings.forEach(b => {
    const bookingDate = b.bookingDate instanceof Date ? b.bookingDate : new Date(b.bookingDate);
    // Weekly
    if (isInRange(bookingDate, startOfWeek, endOfWeek)) {
      weeklyIn++;
      if (b.bookingStatus === 'COMPLETED') weeklyCompleted++;
    }
    // Monthly
    if (isInRange(bookingDate, startOfMonth, endOfMonth)) {
      monthlyIn++;
      if (b.bookingStatus === 'COMPLETED') monthlyCompleted++;
    }
  });

  res.status(200).json({
    success: true,
    services: services.map(s => ({ id: s._id, name: s.name })),
    totalBookings: bookings.length,
    bookings,
    stats: {
      weekly: {
        total: weeklyIn,
        completed: weeklyCompleted,
      },
      monthly: {
        total: monthlyIn,
        completed: monthlyCompleted,
      }
    }
  });
});

/**
 * Get per-status booking counts for the authenticated owner.
 * Optional filters:
 *   - serviceId: only a specific service
 *   - month/year: counts within that calendar month
 *   - weekStart or week/weekYear: counts within that week (Sunday start)
 * If no time filter is provided, returns overall counts across all time.
 */
exports.getOwnerBookingStatusCounts = asyncHandler(async (req, res) => {
  const ownerId = req.owner.id || req.owner._id;
  const { serviceId, month, year, weekStart, week, weekYear, period } = req.query;

  // Resolve services owned by this owner
  let services = [];
  if (serviceId) {
    services = await Service.find({ _id: serviceId }).select("_id");
  } else {
    const businesses = await Business.find({ ownerId }).select("_id");
    const businessIds = businesses.map(b => b._id);
    if (businessIds.length === 0) {
      return res.status(200).json({
        success: true,
        counts: { total: 0, PENDING: 0, APPROVED: 0, COMPLETED: 0, REJECTED: 0, CANCELLED: 0 },
        weekly: { total: 0, PENDING: 0, APPROVED: 0, COMPLETED: 0, REJECTED: 0, CANCELLED: 0 },
        monthly: { total: 0, PENDING: 0, APPROVED: 0, COMPLETED: 0, REJECTED: 0, CANCELLED: 0 }
      });
    }
    services = await Service.find({ businessId: { $in: businessIds } }).select("_id");
  }
  const serviceIds = services.map(s => s._id);

  // Helper to run aggregation for a given date range
  async function aggregateCounts(rangeStart, rangeEnd) {
    const match = { serviceId: { $in: serviceIds } };
    if (rangeStart && rangeEnd) {
      match.bookingDate = { $gte: rangeStart, $lt: rangeEnd };
    }
    const pipeline = [
      { $match: match },
      { $group: { _id: "$bookingStatus", count: { $sum: 1 } } }
    ];
    const grouped = await Booking.aggregate(pipeline);
    const base = { total: 0, PENDING: 0, APPROVED: 0, COMPLETED: 0, REJECTED: 0, CANCELLED: 0 };
    grouped.forEach(g => {
      base.total += g.count;
      base[g._id] = g.count;
    });
    return base;
  }

  // Compute week range when requested
  const now = new Date();
  let weekStartDate;
  if (weekStart) {
    const ws = new Date(weekStart);
    if (!isNaN(ws)) {
      weekStartDate = new Date(ws);
      weekStartDate.setHours(0, 0, 0, 0);
    }
  } else if (week) {
    const y = Number(weekYear) || now.getFullYear();
    const w = Math.max(1, Number(week));
    const jan1 = new Date(y, 0, 1);
    const jan1Day = jan1.getDay();
    const firstWeekStart = new Date(jan1);
    firstWeekStart.setDate(jan1.getDate() - jan1Day);
    weekStartDate = new Date(firstWeekStart);
    weekStartDate.setDate(firstWeekStart.getDate() + (w - 1) * 7);
    weekStartDate.setHours(0, 0, 0, 0);
  }
  if (!weekStartDate) {
    weekStartDate = new Date(now);
    weekStartDate.setDate(now.getDate() - now.getDay());
    weekStartDate.setHours(0, 0, 0, 0);
  }
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 7);

  // Compute month range when requested or default current month for monthly section
  const m = Number(month);
  const y = Number(year);
  let monthStartDate;
  let monthEndDate;
  if (!isNaN(m) && m >= 1 && m <= 12) {
    const useYear = !isNaN(y) ? y : now.getFullYear();
    monthStartDate = new Date(useYear, m - 1, 1);
    monthEndDate = new Date(useYear, m, 1);
  } else {
    monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  // If client specifies a period, return only that period (default monthly)
  const normalizedPeriod = String(period || 'monthly').toLowerCase();
  if (normalizedPeriod === 'weekly') {
    const weeklyCounts = await aggregateCounts(weekStartDate, weekEndDate);
    return res.status(200).json({
      success: true,
      period: 'weekly',
      range: { start: weekStartDate, end: weekEndDate },
      counts: weeklyCounts
    });
  }

  if (normalizedPeriod === 'monthly') {
    const monthlyCounts = await aggregateCounts(monthStartDate, monthEndDate);
    return res.status(200).json({
      success: true,
      period: 'monthly',
      range: { start: monthStartDate, end: monthEndDate },
      counts: monthlyCounts
    });
  }

  // Backward-compatible response when no recognized period is provided
  const [overallCounts, weeklyCounts, monthlyCounts] = await Promise.all([
    aggregateCounts(),
    aggregateCounts(weekStartDate, weekEndDate),
    aggregateCounts(monthStartDate, monthEndDate)
  ]);

  res.status(200).json({
    success: true,
    counts: overallCounts,
    weekly: weeklyCounts,
    monthly: monthlyCounts
  });
});

/**
 * Get all bookings under a single business combined across its services.
 * Params:
 *   - businessId: path param
 * Query:
 *   - status (optional): PENDING|APPROVED|COMPLETED|REJECTED|CANCELLED
 *   - period (optional): monthly|weekly
 *   - month, year (optional when period=monthly)
 *   - weekStart or week/weekYear (optional when period=weekly)
 *   - page, limit (optional): pagination
 */
exports.getBusinessCombinedBookings = asyncHandler(async (req, res) => {
  const { businessId } = req.params;
  const { status, period, month, year, weekStart, week, weekYear } = req.query;

  // Build base match using businessId directly from Booking schema
  const match = { businessId };
  if (status) {
    match.bookingStatus = String(status).toUpperCase();
  }

  // Date range per period
  const now = new Date();
  let rangeStart;
  let rangeEnd;
  const normalizedPeriod = period ? String(period).toLowerCase() : undefined;

  if (normalizedPeriod === 'weekly') {
    let start = undefined;
    if (weekStart) {
      const ws = new Date(weekStart);
      if (!isNaN(ws)) {
        start = new Date(ws);
        start.setHours(0, 0, 0, 0);
      }
    } else if (week) {
      const y = Number(weekYear) || now.getFullYear();
      const w = Math.max(1, Number(week));
      const jan1 = new Date(y, 0, 1);
      const jan1Day = jan1.getDay();
      const firstWeekStart = new Date(jan1);
      firstWeekStart.setDate(jan1.getDate() - jan1Day);
      start = new Date(firstWeekStart);
      start.setDate(firstWeekStart.getDate() + (w - 1) * 7);
      start.setHours(0, 0, 0, 0);
    }
    if (!start) {
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
    }
    rangeStart = start;
    rangeEnd = new Date(start);
    rangeEnd.setDate(start.getDate() + 7);
  } else if (normalizedPeriod === 'monthly' || !normalizedPeriod) {
    const m = Number(month);
    const y = Number(year);
    if (!isNaN(m) && m >= 1 && m <= 12) {
      const useYear = !isNaN(y) ? y : now.getFullYear();
      rangeStart = new Date(useYear, m - 1, 1);
      rangeEnd = new Date(useYear, m, 1);
    } else {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }

  if (rangeStart && rangeEnd) {
    match.bookingDate = { $gte: rangeStart, $lt: rangeEnd };
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [bookings, total, counts] = await Promise.all([
    Booking.find(match).lean()
      .populate('userId', 'name email')
      .populate('petId', 'name type')
      .populate('serviceId', 'name serviceType')
      .sort({ bookingDate: -1, bookingTime: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(match),
    Booking.aggregate([
      { $match: match },
      { $group: { _id: '$bookingStatus', count: { $sum: 1 } } }
    ])
  ]);

  const statusCounts = { total, PENDING: 0, APPROVED: 0, COMPLETED: 0, REJECTED: 0, CANCELLED: 0 };
  counts.forEach(c => { statusCounts[c._id] = c.count; });

  res.status(200).json({
    success: true,
    businessId,
    period: normalizedPeriod || 'monthly',
    range: rangeStart && rangeEnd ? { start: rangeStart, end: rangeEnd } : undefined,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    counts: statusCounts,
    bookings
  });
});