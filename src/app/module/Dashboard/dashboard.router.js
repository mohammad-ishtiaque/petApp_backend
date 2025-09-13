const express = require('express');
const router = express.Router();

const { getPetOwnerDetailsById, getAllPetOwners, blockPetOwner, unblockPetOwner } = require('./PetOwners/petOwners.controller');
const { getBusinessOwnerDetailsById, getAllBusinessOwners, blockBusinessOwner, unblockBusinessOwner } = require('./BusinessOwner/businessOwner.controller');
const { getAllBusiness, getAllBookingsByBusinessId, getAllServicesWithStats, getServiceBookingDetails } = require('./Booking/booking.dashboard');
const { getDashboardStats, getDashboardOverview } = require('./DashboardHome/dashboardHome.controller');
// const { getPetDetailsById, getAllPets, blockPet, unblockPet } = require('./pets.controller');   
const { authenticateAdminOrSuperAdmin } = require('../../middleware/auth.middleware');

// Unified Dashboard Routes - Main dashboard statistics
router.get('/stats', authenticateAdminOrSuperAdmin, getDashboardStats);
router.get('/overview', authenticateAdminOrSuperAdmin, getDashboardOverview);

router.get('/pet-owner/:id', authenticateAdminOrSuperAdmin, getPetOwnerDetailsById);
router.get('/pet-owners', authenticateAdminOrSuperAdmin, getAllPetOwners);
router.put('/pet-owner/:id/block', authenticateAdminOrSuperAdmin, blockPetOwner);
router.put('/pet-owner/:id/unblock', authenticateAdminOrSuperAdmin, unblockPetOwner);

router.get('/business-owner/:id', authenticateAdminOrSuperAdmin, getBusinessOwnerDetailsById);
router.get('/business-owners', authenticateAdminOrSuperAdmin, getAllBusinessOwners);
router.put('/business-owner/:id/block', authenticateAdminOrSuperAdmin, blockBusinessOwner);
router.put('/business-owner/:id/unblock', authenticateAdminOrSuperAdmin, unblockBusinessOwner);  

router.get('/business', authenticateAdminOrSuperAdmin, getAllBusiness);
router.get('/get-bookings-by-business/:id', authenticateAdminOrSuperAdmin, getAllBookingsByBusinessId);

// New service analytics routes
router.get('/services-stats', authenticateAdminOrSuperAdmin, getAllServicesWithStats);
router.get('/service-bookings/:serviceId', authenticateAdminOrSuperAdmin, getServiceBookingDetails);


module.exports = router;