const express = require('express');
const router = express.Router();

const { createBusiness } = require('./business.controller');
const upload = require('../../../utils/upload');
const { authenticateOwner } = require('../../middleware/auth.middleware');


router.post('/create', authenticateOwner, upload.fields([{name: 'shopLogo', maxCount: 1}, {name: 'shopPic', maxCount: 2}]), createBusiness);

module.exports = router;

