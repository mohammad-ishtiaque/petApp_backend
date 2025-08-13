    const express = require('express');
    const router = express.Router();
    const { createPrivacy, getAllPrivacies, updatePrivacy, deletePrivacy, getPrivacyById } = require('./privacy.controller');
    const { authenticateAdminOrSuperAdmin } = require('../../../middleware/auth.middleware');
    router.post('/create', authenticateAdminOrSuperAdmin, createPrivacy);
    router.get('/get', getAllPrivacies);
    router.put('/update/:id', authenticateAdminOrSuperAdmin, updatePrivacy);
    router.delete('/delete/:id', authenticateAdminOrSuperAdmin, deletePrivacy);
    router.get('/get/:id', getPrivacyById);
    
    module.exports = router;