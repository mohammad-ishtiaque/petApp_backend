const express = require('express');
const { createService, getAllServices, getServicesById, updateService, deleteService } = require('./businessServices.controller');
const router = express.Router();
const { authenticateOwner, authenticateOwnerAndUser } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');

router.post('/createService',authenticateOwner,  upload.array('servicesImages', 2) ,createService);
router.get('/getServices', authenticateOwner, getAllServices);
router.get('/getServicesById/:id', authenticateOwner, getServicesById);
router.put('/updateService/:id', authenticateOwner, upload.array('servicesImages', 2), updateService);
router.delete('/deleteService/:id', authenticateOwner, deleteService);

module.exports = router;