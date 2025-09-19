const express = require('express');
const router = express.Router();
const { createTopBrand, getAllTopBrands, deleteTopBrand } = require('../TopBrands/topBrands.controller');
const { authenticateAdminOrSuperAdmin, authenticateOwnerAndUser } = require('../../../middleware/auth.middleware');
const upload = require('../../../../utils/upload');

// Authenticate first, then upload single file with field name 'logo'
router.post('/create', authenticateAdminOrSuperAdmin, upload.single('logo'), createTopBrand);
router.get('/get-all', authenticateOwnerAndUser, getAllTopBrands);
router.delete('/delete/:id', authenticateAdminOrSuperAdmin, deleteTopBrand); 

module.exports = router;
