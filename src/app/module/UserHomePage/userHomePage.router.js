const express = require('express');
const { getServicesByType, totalPetsForLoggedInUser, allAdsWhichActive, getActiveAdsDetails } = require('./userHomePage.controller');
const { authenticateUser } = require('../../middleware/auth.middleware');
const router = express.Router();

router.get('/getServicesByType/:type', getServicesByType);
router.get('/totalPetsForLoggedInUser', authenticateUser, totalPetsForLoggedInUser);
router.get('/allAdsWhichActive', authenticateUser, allAdsWhichActive);
router.get('/getActiveAdsDetails/:id', authenticateUser, getActiveAdsDetails);


module.exports = router;