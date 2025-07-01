const express = require('express');
const router = express.Router();

const { createBusiness, getBusiness, getBusinessById, updateBusiness, deleteBusiness, getAllBusiness } = require('./business.controller');
const upload = require('../../../utils/upload');
const { authenticateOwner } = require('../../middleware/auth.middleware');


router.post('/create', authenticateOwner, upload.fields([{name: 'shopLogo', maxCount: 1}, {name: 'shopPic', maxCount: 2}]), createBusiness);
router.get('/get', authenticateOwner, getBusiness);
router.get('/get/:id', authenticateOwner, getBusinessById);
router.put('/update/:id', authenticateOwner, upload.fields([{name: 'shopLogo', maxCount: 1}, {name: 'shopPic', maxCount: 2}]), updateBusiness);
router.delete('/delete/:id', authenticateOwner, deleteBusiness);
//for admin only 

router.get('/get-all', getAllBusiness);

module.exports = router;

