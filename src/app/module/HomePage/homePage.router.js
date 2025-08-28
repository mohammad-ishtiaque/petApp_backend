const express = require('express');
const router = express.Router();
const { getAllServicesByCategory, getAllAdvertisements } = require('./homePage.controller');

router.get('/getServicesByCategory', getAllServicesByCategory);
router.get('/getAllAdvertisements', getAllAdvertisements);

module.exports = router;
