const express = require('express');
const router = express.Router();
const { createBooking, getBooking, getBookingsByServiceId, deleteBooking } = require('./booking.controller');
const { authenticateUser } = require('../../middleware/auth.middleware');
router.post('/create-booking', authenticateUser, createBooking);
router.get('/get-bookings', authenticateUser, getBooking);
router.get('/get-bookings-by-service-id/:id', authenticateUser, getBookingsByServiceId);
router.delete('/delete/:id', authenticateUser, deleteBooking);


module.exports = router;