const express = require('express');

const router = express.Router();

const { createAdvertisement, deleteAdvertisement, getAdvertisement } = require('./advertisement.controller');
const { authenticateOwner } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');

router.post('/add-advertisement', authenticateOwner, upload.array('advertisementImg', 5), createAdvertisement);
router.delete('/delete-ads/:id', authenticateOwner, deleteAdvertisement);
router.get('/get-ads', authenticateOwner, getAdvertisement);

module.exports = router;
