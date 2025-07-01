const express = require('express');
const { createService, getAllServices, getServicesById, updateService, deleteService } = require('./services.controller');
const router = express.Router();
const { authenticateOwner } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');

router.post('/createService',authenticateOwner,  upload.array('servicesImages', 2) ,createService);
router.get('/getServices', authenticateOwner, getAllServices);
router.get('/getServicesById/:id', authenticateOwner, getServicesById);
router.put('/updateService/:id', authenticateOwner, upload.array('servicesImages', 2), updateService);
router.delete('/deleteService/:id', authenticateOwner, deleteService);

module.exports = router;