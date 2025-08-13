const express = require('express');

const router = express.Router();

const { createFaq, getAllFaqs, updateFaq, deleteFaq, getFaqById } = require('./faq.controller');
const { authenticateAdminOrSuperAdmin } = require('../../../middleware/auth.middleware');

router.post('/create', authenticateAdminOrSuperAdmin, createFaq);
router.get('/get', getAllFaqs);
router.put('/update/:id', authenticateAdminOrSuperAdmin, updateFaq);
router.delete('/delete/:id', authenticateAdminOrSuperAdmin, deleteFaq);
router.get('/get/:id', getFaqById);

module.exports = router;
