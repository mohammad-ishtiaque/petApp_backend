const express = require('express');
const router = express.Router();

const { getUserProfile, updateUserProfile, changePassword } = require('./userProfile.controller');
const { authenticateUser } = require('../../middleware/auth.middleware');

router.get('/get-profile', authenticateUser, getUserProfile);
router.put('/update-profile', authenticateUser, updateUserProfile);
router.put('/change-password', authenticateUser, changePassword);


module.exports = router;
