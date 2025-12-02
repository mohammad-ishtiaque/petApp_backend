const asyncHandler = require('../../../utils/asyncHandler');
const Booking = require('./Booking');
const Service = require('../BusinessServices/Services');
const Business = require('../Business/Business');

/**
 * @desc    Get booking overview for owner (monthly OR weekly view)
 * @route   GET /api/bookings/owner/overview
 * @access  Private (Owner)
 * @query   {
 *   viewType: 'monthly' | 'weekly' (default: 'monthly'),
 *   serviceId?: string,
 *   status?: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'APPROVED' | 'CANCELLED',
 *   month?: number (1-12, for monthly view),
 *   year?: number (for monthly view),
 *   weekStart?: string (ISO date, for weekly view),
 *   week?: number (1-52, for weekly view),
 *   weekYear?: number (for weekly view)
 * }
 * 
 * @example Monthly view for September 2025:
 * GET /api/bookings/owner/overview?viewType=monthly&month=9&year=2025
 * 
 * @example Weekly view for current week:
 * GET /api/bookings/owner/overview?viewType=weekly
 */
const getOwnerBookingOverview = asyncHandler(async (req, res) => {
    const ownerId = req.owner.id || req.owner._id;
    const { viewType = 'monthly', serviceId, status, month, year, weekStart, week, weekYear } = req.query;

    // Validate viewType
    const normalizedViewType = String(viewType).toLowerCase();
    if (!['monthly', 'weekly'].includes(normalizedViewType)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid viewType. Must be "monthly" or "weekly"'
        });
    }

    // ============================================
    // 1. FIND OWNER'S SERVICES
    // ============================================
    let services = [];

    if (serviceId) {
        services = await Service.find({ _id: serviceId }).select('_id name');
    } else {
        const businesses = await Business.find({ ownerId }).select('_id');
        const businessIds = businesses.map(b => b._id);

        if (businessIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No businesses found for this owner',
                viewType: normalizedViewType,
                services: [],
                totalBookings: 0,
                bookings: [],
                stats: {
                    total: 0,
                    pending: 0,
                    approved: 0,
                    completed: 0,
                    rejected: 0,
                    cancelled: 0
                }
            });
        }

        services = await Service.find({ businessId: { $in: businessIds } }).select('_id name');
    }

    const serviceIds = services.map(s => s._id);

    if (serviceIds.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'No services found',
            viewType: normalizedViewType,
            services: [],
            totalBookings: 0,
            bookings: [],
            stats: {
                total: 0,
                pending: 0,
                approved: 0,
                completed: 0,
                rejected: 0,
                cancelled: 0
            }
        });
    }

    // ============================================
    // 2. CALCULATE DATE RANGE BASED ON VIEW TYPE
    // ============================================
    const now = new Date();
    let startDate, endDate, dateRangeInfo;

    if (normalizedViewType === 'weekly') {
        // WEEKLY VIEW
        startDate = calculateWeekStart(now, weekStart, week, weekYear);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        const weekNumber = getWeekNumber(startDate);
        dateRangeInfo = {
            viewType: 'weekly',
            weekNumber: weekNumber,
            year: startDate.getFullYear(),
            start: startDate.toISOString().split('T')[0],
            end: new Date(endDate.getTime() - 1).toISOString().split('T')[0]
        };
    } else {
        // MONTHLY VIEW
        const { startOfMonth, endOfMonth } = calculateMonthRange(now, month, year);
        startDate = startOfMonth;
        endDate = endOfMonth;

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        dateRangeInfo = {
            viewType: 'monthly',
            month: startDate.getMonth() + 1, // 1-12
            monthName: monthNames[startDate.getMonth()],
            year: startDate.getFullYear(),
            start: startDate.toISOString().split('T')[0],
            end: new Date(endDate.getTime() - 1).toISOString().split('T')[0]
        };
    }

    // ============================================
    // 3. BUILD BOOKING QUERY
    // ============================================
    const bookingQuery = {
        serviceId: { $in: serviceIds },
        bookingDate: {
            $gte: startDate,
            $lt: endDate
        }
    };

    if (status) {
        const normalizedStatus = String(status).toUpperCase();
        bookingQuery.bookingStatus = normalizedStatus;
    }

    // ============================================
    // 4. FETCH BOOKINGS
    // ============================================
    const bookings = await Booking.find(bookingQuery)
        .populate('userId', 'name email profilePic')
        .populate('petId', 'name type breed')
        .populate('serviceId', 'name')
        .sort({ bookingDate: -1, bookingTime: -1 })
        .lean();

    // ============================================
    // 5. CALCULATE STATISTICS
    // ============================================
    const stats = calculateSingleViewStats(bookings);

    // ============================================
    // 6. SEND RESPONSE
    // ============================================
    res.status(200).json({
        success: true,
        message: `${dateRangeInfo.monthName || 'Week ' + dateRangeInfo.weekNumber} booking overview`,
        viewType: normalizedViewType,
        dateRange: dateRangeInfo,
        services: services.map(s => ({ id: s._id, name: s.name })),
        totalBookings: bookings.length,
        bookings,
        stats
    });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate the start of the week
 */
function calculateWeekStart(now, weekStart, week, weekYear) {
    let startOfWeek;

    if (weekStart) {
        const ws = new Date(weekStart);
        if (!isNaN(ws)) {
            startOfWeek = new Date(ws);
            startOfWeek.setHours(0, 0, 0, 0);
        }
    }

    if (!startOfWeek && week) {
        const y = Number(weekYear) || now.getFullYear();
        const w = Math.max(1, Math.min(52, Number(week)));

        const jan1 = new Date(y, 0, 1);
        const jan1Day = jan1.getDay();

        const firstWeekStart = new Date(jan1);
        firstWeekStart.setDate(jan1.getDate() - jan1Day);

        startOfWeek = new Date(firstWeekStart);
        startOfWeek.setDate(firstWeekStart.getDate() + (w - 1) * 7);
        startOfWeek.setHours(0, 0, 0, 0);
    }

    if (!startOfWeek) {
        startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
    }

    return startOfWeek;
}

/**
 * Calculate start and end of month
 */
function calculateMonthRange(now, month, year) {
    let startOfMonth, endOfMonth;

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

    return { startOfMonth, endOfMonth };
}

/**
 * Get week number of the year
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Calculate booking statistics for a single period
 */
function calculateSingleViewStats(bookings) {
    const stats = {
        total: 0,
        pending: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
        cancelled: 0
    };

    bookings.forEach(booking => {
        stats.total++;
        const status = booking.bookingStatus.toLowerCase();
        stats[status] = (stats[status] || 0) + 1;
    });

    return stats;
}

module.exports = {
    getOwnerBookingOverview,
    // Export helpers for testing
    calculateWeekStart,
    calculateMonthRange,
    calculateSingleViewStats,
    getWeekNumber
};
