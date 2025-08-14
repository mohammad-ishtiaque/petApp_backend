    const express = require('express');
    const router = express.Router();
    const { createPrivacy, getPrivacy, updatePrivacy, deletePrivacy } = require('./privacy.controller');
    const { authenticateAdminOrSuperAdmin } = require('../../../middleware/auth.middleware');
    router.post('/create', authenticateAdminOrSuperAdmin, createPrivacy);
    router.get('/get', getPrivacy);
    router.put('/update/:id', authenticateAdminOrSuperAdmin, updatePrivacy);
    router.delete('/delete/:id', authenticateAdminOrSuperAdmin, deletePrivacy);
    
    module.exports = router;