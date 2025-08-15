const express = require('express');
const { getServiceByType, totalPetsForLoggedInUser, allAdsWhichActive, getActiveAdsDetails } = require('./userHomePage.controller');
const { authenticateUser } = require('../../middleware/auth.middleware');
const router = express.Router();

router.get('/getServiceByType/:type', getServiceByType);
router.get('/totalPetsForLoggedInUser', authenticateUser, totalPetsForLoggedInUser);
router.get('/allAdsWhichActive', authenticateUser, allAdsWhichActive);
router.get('/getActiveAdsDetails/:id', authenticateUser, getActiveAdsDetails);


module.exports = router;