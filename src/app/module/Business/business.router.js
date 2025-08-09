const express = require('express');
const router = express.Router();

const { createBusiness, getBusiness, getBusinessById, updateBusiness, deleteBusiness, getAllBusiness, addAdvertisement } = require('./business.controller');
const upload = require('../../../utils/upload');
const { authenticateOwner, authenticateOwnerAndUser } = require('../../middleware/auth.middleware');
const { uploadArrayMiddleware } = require('../../../utils/upload');


router.post('/create', authenticateOwner,  uploadArrayMiddleware('shopPic', 2), createBusiness);
router.get('/get', authenticateOwner, getBusiness);
router.get('/get/:id', authenticateOwner, getBusinessById);
router.put('/update/:id', authenticateOwner,  uploadArrayMiddleware('shopPic', 2), updateBusiness);
router.delete('/delete/:id', authenticateOwner, deleteBusiness);
// router.post('/add-advertisement', authenticateOwner, upload.array('advertisementImg', 2), addAdvertisement);
//for admin only 

router.get('/get-all', getAllBusiness);

module.exports = router;

