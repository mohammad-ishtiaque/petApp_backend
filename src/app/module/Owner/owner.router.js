const express = require('express');
const router = express.Router();
const { getOwnerDetails, updateOwnerProfile, deleteOwner, getOwnerBusinesses, getAllBookingsByOwner,getBookingsByOwnerWithStatusAndPagination, updateBookingStatus, getBookingsByServiceType, getBookedPetsByOwner, gtPetDetailsByPetId, getOwnerReviewsWithAvg } = require('./owner.controller');
const { authenticateOwner } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');

router.get('/get-owner-details', authenticateOwner, getOwnerDetails);
router.put('/update-owner-details', authenticateOwner, upload.single('profilePic'), updateOwnerProfile);
// router.delete('/delete-owner', authenticateOwner, deleteOwner);
router.get('/get-owner-businesses', authenticateOwner, getOwnerBusinesses);
router.get('/get-bookings-by-owner', authenticateOwner, getAllBookingsByOwner);
router.put('/update-booking-status/:id', authenticateOwner, updateBookingStatus);
router.get('/get-booking-by-sesrviceType', authenticateOwner, getBookingsByServiceType)
router.get('/get-all-pets-who-booked', authenticateOwner, getBookedPetsByOwner)
router.get('/get-pet-details-by-pet-id/:id', authenticateOwner, gtPetDetailsByPetId)
router.get('/get-bookings-by-owner-with-status', authenticateOwner, getBookingsByOwnerWithStatusAndPagination)
router.get('/get-reviews-withAvg', authenticateOwner, getOwnerReviewsWithAvg)

module.exports = router;