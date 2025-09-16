const User = require('../../User/User');
const Owner = require('../../Owner/Owner');
const Booking = require('../../Booking/Booking');
const Business = require('../../Business/Business');
const BusinessServices = require('../../BusinessServices/Services');
const { ApiError } = require('../../../../errors/errorHandler');
const asyncHandler = require('../../../../utils/asyncHandler');

// Optimized Helper function to get monthly growth data using MongoDB Aggregation
async function getMonthlyGrowthData(Model, year, role = null) {
    const matchQuery = {
        createdAt: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59)
        }
    };

    if (role) {
        matchQuery.role = role;
    }

    const monthlyData = await Model.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: { $month: '$createdAt' },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    const monthlyCounts = Array(12).fill(0);
    monthlyData.forEach(item => {
        monthlyCounts[item._id - 1] = item.count;
    });

    let cumulativeCount = 0;
    const result = monthlyCounts.map((count, index) => {
        cumulativeCount += count;
        return {
            month: new Date(year, index).toLocaleString('en-US', { month: 'short' }),
            count: count,
            cumulative: cumulativeCount
        };
    });

    return result;
}

// Unified Dashboard API - Consolidates all dashboard metrics into a single endpoint
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
    try {
        // Get year from query parameter or default to current year
        const currentYear = parseInt(req.query.year) || new Date().getFullYear();

        // Perform all aggregations in parallel
        const [
            totalUsers,
            totalSellers,
            bookingStats,
            totalSubscribers,
            monthlyUserGrowth,
            monthlySellerGrowth,
            recentBusinesses,
            additionalStats
        ] = await Promise.all([
            User.countDocuments({ role: 'USER' }),
            Owner.countDocuments({ role: 'OWNER' }),
            Booking.aggregate([
                {
                    $group: {
                        _id: null,
                        totalBookings: { $sum: 1 },
                        completedBookings: {
                            $sum: {
                                $cond: [{ $eq: ['$bookingStatus', 'COMPLETED'] }, 1, 0]
                            }
                        },
                        pendingBookings: {
                            $sum: {
                                $cond: [{ $eq: ['$bookingStatus', 'PENDING'] }, 1, 0]
                            }
                        }
                    }
                }
            ]),
            User.countDocuments({ isVerified: true }),
            getMonthlyGrowthData(User, currentYear, 'USER'),
            getMonthlyGrowthData(Owner, currentYear, 'OWNER'),
            Owner.find()
                .populate('businesses', 'businessName')
                .select('name email phone address createdAt')
                .sort({ createdAt: -1 })
                .limit(10),
            Business.aggregate([
                {
                    $group: {
                        _id: null,
                        totalBusinesses: { $sum: 1 }
                    }
                }
            ]).then(async result => {
                const serviceStats = await BusinessServices.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalServices: { $sum: 1 },
                            activeServices: {
                                $sum: {
                                    $cond: [{ $eq: ['$isActive', true] }, 1, 0]
                                }
                            }
                        }
                    }
                ]);
                return {
                    totalBusinesses: result.length > 0 ? result[0].totalBusinesses : 0,
                    totalServices: serviceStats.length > 0 ? serviceStats[0].totalServices : 0,
                    activeServices: serviceStats.length > 0 ? serviceStats[0].activeServices : 0
                };
            })
        ]);

        const { totalBookings = 0, completedBookings = 0, pendingBookings = 0 } = bookingStats[0] || {};
        const averageBookingValue = 50; // This should be replaced with actual pricing logic
        const totalIncome = completedBookings * averageBookingValue;

        // Format business requests for frontend
        const formattedBusinesses = recentBusinesses.map((owner, index) => ({
            no: index + 1,
            shopOwnerName: owner.name,
            shopName: owner.businesses?.businessName || 'Pending',
            date: owner.createdAt.toLocaleDateString('en-US'),
            location: owner.address || 'Not provided',
            email: owner.email,
            phone: owner.phone
        }));

        res.status(200).json({
            success: true,
            message: 'Dashboard statistics fetched successfully',
            data: {
                // Main dashboard cards
                totalUsers,
                totalIncome,
                totalSellers,
                totalSubscribers,

                // Growth charts data
                userGrowth: {
                    year: currentYear,
                    monthlyData: monthlyUserGrowth
                },
                sellerGrowth: {
                    year: currentYear,
                    monthlyData: monthlySellerGrowth
                },

                // Business owner requests table
                businessOwners: formattedBusinesses,

                // Additional metrics
                additionalStats: {
                    totalBookings,
                    pendingBookings,
                    totalBusinesses: additionalStats.totalBusinesses,
                    totalServices: additionalStats.totalServices,
                    activeServices: additionalStats.activeServices
                }
            }
        });
    } catch (err) {
        return next(err);
    }
});

// Get dashboard overview with year filter
exports.getDashboardOverview = asyncHandler(async (req, res, next) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);

        const matchYear = { createdAt: { $gte: yearStart, $lte: yearEnd } };

        const [
            newUsers,
            newSellers,
            yearlyBookings,
            yearlyCompletedBookings
        ] = await Promise.all([
            User.countDocuments({ ...matchYear, role: 'USER' }),
            Owner.countDocuments({ ...matchYear, role: 'OWNER' }),
            Booking.countDocuments(matchYear),
            Booking.countDocuments({ ...matchYear, bookingStatus: 'COMPLETED' })
        ]);

        const yearlyRevenue = yearlyCompletedBookings * 50; // Assuming average booking value

        res.status(200).json({
            success: true,
            message: `Dashboard overview for ${year} fetched successfully`,
            data: {
                year,
                newUsers,
                newSellers,
                yearlyBookings,
                yearlyRevenue
            }
        });
    } catch (err) {
        return next(err);
    }
});
