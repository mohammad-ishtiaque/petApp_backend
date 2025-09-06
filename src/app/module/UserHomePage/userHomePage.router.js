const express = require('express');
const { getServicesByType, totalPetsForLoggedInUser, allAdsWhichActive, getActiveAdsDetails, getAllUserHomePageData } = require('./userHomePage.controller');
const { authenticateUser } = require('../../middleware/auth.middleware');
const router = express.Router();

router.get('/getServicesByType/:type', getServicesByType);
router.get('/totalPetsForLoggedInUser', authenticateUser, totalPetsForLoggedInUser);
router.get('/allAdsWhichActive', authenticateUser, allAdsWhichActive);
router.get('/getActiveAdsDetails/:id', authenticateUser, getActiveAdsDetails);
router.get('/getAllUserHomePageData', authenticateUser, getAllUserHomePageData);


module.exports = router;