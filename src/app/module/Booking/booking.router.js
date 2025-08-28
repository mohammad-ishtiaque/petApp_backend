const express = require('express');
const router = express.Router();
const { createBooking, getBooking, getBookingDetails, deleteBooking, updateBooking } = require('./booking.controller');
const { authenticateUser } = require('../../middleware/auth.middleware');
router.post('/create-booking', authenticateUser, createBooking);
router.get('/get-bookings', authenticateUser, getBooking);
router.put('/update/:id', authenticateUser, updateBooking);
router.get('/get-bookings-by-service-id/:id', authenticateUser, getBookingDetails);
router.delete('/delete/:id', authenticateUser, deleteBooking);


module.exports = router;