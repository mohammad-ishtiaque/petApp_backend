const express = require('express');
const router = express.Router();

const { getUserProfile, updateUserProfile, changePassword, getMyPets, deleteAccount, getMyAppointment, saveDeviceToken } = require('./userprofile.controller');
const { authenticateUser, authenticateOwnerAndUser } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');

router.get('/get-profile', authenticateUser, getUserProfile);
router.put('/update-profile', authenticateUser, upload.single('profilePic'), updateUserProfile);
router.put('/change-password', authenticateOwnerAndUser, changePassword);
router.get('/my-pets', authenticateUser, getMyPets);
router.delete('/delete-account', authenticateOwnerAndUser, deleteAccount);
router.get('/get-my-bookings', authenticateUser, getMyAppointment);
router.post('/device-token', authenticateOwnerAndUser, saveDeviceToken);

module.exports = router;

