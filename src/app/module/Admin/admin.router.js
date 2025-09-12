const express = require('express');
const router = express.Router();

const { makeAdmin, makeSuperAdmin, removeAdmin, removeSuperAdmin, getProfile, updateAdminProfile, changePassword } = require('./admin.controller');
const { authenticateAdmin, authenticateSuperAdmin, authenticateAdminOrSuperAdmin } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');

router.get('/get-profile', authenticateAdminOrSuperAdmin, getProfile);
router.put('/update-profile', authenticateAdminOrSuperAdmin, upload.single('profilePic'), updateAdminProfile);
router.put('/change-password', authenticateAdminOrSuperAdmin, changePassword);
router.post('/make-admin', authenticateSuperAdmin, makeAdmin);
router.post('/make-super-admin', makeSuperAdmin);
router.post('/remove-admin', authenticateSuperAdmin, removeAdmin);
router.post('/remove-super-admin', authenticateSuperAdmin, removeSuperAdmin);

module.exports = router;