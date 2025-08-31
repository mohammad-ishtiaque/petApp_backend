const express = require('express');
const router = express.Router();

const { createBusiness, getBusiness, getBusinessById, updateBusiness, deleteBusiness, getAllBusiness, addAdvertisement } = require('./business.controller');
const upload = require('../../../utils/upload');
const { authenticateOwner } = require('../../middleware/auth.middleware');


router.post('/create', authenticateOwner,  upload.fields([{ name: "shopPic", maxCount: 2 }, { name: "shopLogo", maxCount: 1 }]), createBusiness);
router.get('/get', authenticateOwner, getBusiness);
router.get('/get/:id', getBusinessById);
router.put('/update/:id', authenticateOwner,  upload.fields([{ name: "shopPic", maxCount: 2 }, { name: "shopLogo", maxCount: 1 }]), updateBusiness);
router.delete('/delete/:id', authenticateOwner, deleteBusiness);
// router.post('/add-advertisement', authenticateOwner, upload.array('advertisementImg', 2), addAdvertisement);
//for admin only 

router.get('/get-all', getAllBusiness);

module.exports = router;

