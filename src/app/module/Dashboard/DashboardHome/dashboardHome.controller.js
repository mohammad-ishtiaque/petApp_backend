const User = require('../../User/User');
const Owner = require('../../Owner/Owner');
const Booking = require('../../Booking/Booking');
const Business = require('../../Business/Business');
const BusinessServices = require('../../BusinessServices/Services');
const { ApiError } = require('../../../../errors/errorHandler');
const asyncHandler = require('../../../../utils/asyncHandler');

// Unified Dashboard API - Consolidates all dashboard metrics into a single endpoint
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
    try {
        // Get year from query parameter or default to current year
        const currentYear = parseInt(req.query.year) || new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        
        // Calculate Total Users (Pet Owners)
        const totalUsers = await User.countDocuments({ role: 'USER' });
        
        // Calculate Total Sellers/Owners (Business Owners)
        const totalSellers = await Owner.countDocuments({ role: 'OWNER' });
        
        // Calculate Total Income (using completed bookings as proxy since no pricing model exists)
        const totalCompletedBookings = await Booking.countDocuments({ 
            bookingStatus: 'COMPLETED' 
        });
        // Assuming average booking value for demonstration
        const averageBookingValue = 50; // This should be replaced with actual pricing logic
        const totalIncome = totalCompletedBookings * averageBookingValue;
        
        // Calculate Total Subscribers (using verified users as proxy)
        const totalSubscribers = await User.countDocuments({ 
            isVerified: true 
        });
        
        // Get monthly growth data for charts
        const monthlyUserGrowth = await getMonthlyGrowthData(User, currentYear, 'USER');
        const monthlySellerGrowth = await getMonthlyGrowthData(Owner, currentYear, 'OWNER');
        
        // Get recent business owner requests
        const recentBusinesses = await Owner.find()
            .populate('businesses', 'businessName')
            .select('name email phone address createdAt')
            .sort({ createdAt: -1 })
            .limit(10);
        
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
                    totalBookings: await Booking.countDocuments(),
                    pendingBookings: await Booking.countDocuments({ bookingStatus: 'PENDING' }),
                    totalBusinesses: await Business.countDocuments(),
                    totalServices: await BusinessServices.countDocuments(),
                    activeServices: await BusinessServices.countDocuments({ isActive: true })
                }
            }
        });
    } catch (err) {
        return next(err);
    }
});

// Helper function to get monthly growth data
async function getMonthlyGrowthData(Model, year, role = null) {
    const monthlyData = [];
    
    for (let month = 0; month < 12; month++) {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        
        const query = {
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        };
        
        if (role) {
            query.role = role;
        }
        
        const count = await Model.countDocuments(query);
        
        monthlyData.push({
            month: startDate.toLocaleDateString('en-US', { month: 'short' }),
            count: count,
            // Add cumulative count for area charts
            cumulative: await Model.countDocuments({
                createdAt: { $lte: endDate },
                ...(role && { role })
            })
        });
    }
    
    return monthlyData;
}

// Get dashboard overview with year filter
exports.getDashboardOverview = asyncHandler(async (req, res, next) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        
        // Get yearly statistics
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        const yearlyStats = {
            newUsers: await User.countDocuments({
                createdAt: { $gte: yearStart, $lte: yearEnd },
                role: 'USER'
            }),
            newSellers: await Owner.countDocuments({
                createdAt: { $gte: yearStart, $lte: yearEnd },
                role: 'OWNER'
            }),
            yearlyBookings: await Booking.countDocuments({
                createdAt: { $gte: yearStart, $lte: yearEnd }
            }),
            yearlyRevenue: await Booking.countDocuments({
                createdAt: { $gte: yearStart, $lte: yearEnd },
                bookingStatus: 'COMPLETED'
            }) * 50 // Assuming average booking value
        };
        
        res.status(200).json({
            success: true,
            message: `Dashboard overview for ${year} fetched successfully`,
            data: {
                year,
                ...yearlyStats
            }
        });
    } catch (err) {
        return next(err);
    }
});