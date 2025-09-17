const express = require('express');
const router = express.Router();
const { createBooking, getBooking, getBookingDetails, deleteBooking, updateBooking, updateBookingStatusByOwner, cancelBookingByUser, getOwnerBookingOverview } = require('./booking.controller');
const { authenticateUser, authenticateOwner } = require('../../middleware/auth.middleware');
router.post('/create-booking', authenticateUser, createBooking);
router.get('/get-bookings', authenticateUser, getBooking);
router.put('/update/:id', authenticateUser, updateBooking);
router.get('/get-bookings-by-service-id/:id', authenticateUser, getBookingDetails);
router.delete('/delete/:id', authenticateUser, deleteBooking);
// Owner can update status via a single endpoint. Allowed: APPROVED, COMPLETED, CANCELLED
router.put('/:id/status', authenticateOwner, updateBookingStatusByOwner);
// User can cancel their own booking with a reason (no owner approval required)
router.put('/:id/cancel', authenticateUser, cancelBookingByUser);

router.get('/get-booking-overview', authenticateOwner, getOwnerBookingOverview);


module.exports = router;