const express = require('express');
const router = express.Router();
const { getOwnerDetails, updateOwnerDetails, deleteOwner } = require('./owner.controller');
const { authenticateOwner } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');

router.get('/get-owner-details', authenticateOwner, getOwnerDetails);
router.put('/update-owner-details', authenticateOwner, upload.single('ownerPic'), updateOwnerDetails);
router.delete('/delete-owner', authenticateOwner, deleteOwner);

module.exports = router;