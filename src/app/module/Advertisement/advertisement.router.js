const express = require('express');

const router = express.Router();

const { createAdvertisement, deleteAdvertisement, getAdvertisement, getAdvertisementByBusinessId, getAllAds, updateAdsStatus } = require('./advertisement.controller');
const { authenticateOwner, authenticateAdminOrSuperAdmin } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');

router.post('/add-advertisement', authenticateOwner, upload.array('advertisementImg', 5), createAdvertisement);
router.delete('/delete-ads/:id', authenticateOwner, deleteAdvertisement);
router.get('/get-ads', authenticateOwner, getAdvertisement);
router.get('/get-ads-by-business/:id', authenticateOwner, getAdvertisementByBusinessId);
router.put('/update-ads-status/:id', authenticateAdminOrSuperAdmin, updateAdsStatus);
router.get('/get-all-ads',authenticateAdminOrSuperAdmin, getAllAds);

module.exports = router;
