const express = require('express');
const { createService, getAllServices, getServicesById, updateService, deleteService, getNearbyServices } = require('./businessServices.controller');
const router = express.Router();
const { authenticateOwner, authenticateUser, authenticateOwnerAndUser } = require('../../middleware/auth.middleware');
const upload = require('../../../utils/upload');

router.post('/createService',authenticateOwner,  upload.single('servicesImages') ,createService);
router.get('/getServices', authenticateOwner, getAllServices);
router.get('/getServicesById/:id', getServicesById);
router.put('/updateService/:id', authenticateOwner, upload.single('servicesImages'), updateService);
router.delete('/deleteService/:id', authenticateOwner, deleteService);
// Public endpoint to find nearby services within radiusKm (default 10)
router.get('/nearby', getNearbyServices);

module.exports = router;