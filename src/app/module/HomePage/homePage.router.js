const express = require('express');
const router = express.Router();
const { getAllServicesByCategory, getAllAdvertisements } = require('./homePage.controller');
const { searchServices, getAllAdvertisements } = require('./homePage.controller');
const { getAllServicesByCategory, getAllAdvertisements, searchServices } = require('./homePage.controller');

router.get('/getServicesByCategory', getAllServicesByCategory);
router.get('/services/search', searchServices);
router.get('/getAllAdvertisements', getAllAdvertisements);

module.exports = router;
