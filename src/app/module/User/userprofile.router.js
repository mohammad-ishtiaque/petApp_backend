const express = require('express');
const router = express.Router();

const { getUserProfile, updateUserProfile, changePassword, getMyPets, deleteAccount,getMyAppointment } = require('./userProfile.controller');
const { authenticateUser } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');
const { uploadMiddleware } = require('../../../utils/upload');

router.get('/get-profile', authenticateUser, getUserProfile);
router.put('/update-profile', authenticateUser, uploadMiddleware('profilePic'), updateUserProfile);
router.put('/change-password', authenticateUser, changePassword);
router.get('/my-pets', authenticateUser, getMyPets);
router.delete('/delete-account', authenticateUser, deleteAccount);
router.get('/get-my-bookings', authenticateUser, getMyAppointment)

module.exports = router;
