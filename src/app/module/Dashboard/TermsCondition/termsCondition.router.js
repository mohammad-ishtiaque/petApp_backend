const express = require('express');
const { createTermsCondition, getAllTermsConditions, updateTermsCondition, deleteTermsCondition, getTermsConditionById } = require('./termsCondition.controller');
const router = express.Router();
const { authenticateOwner } = require('../../../middleware/auth.middleware');

router.post('/create',authenticateOwner, createTermsCondition);
router.get('/get', getAllTermsConditions);
router.put('/update/:id', authenticateOwner,  updateTermsCondition);
router.delete('/delete/:id', authenticateOwner, deleteTermsCondition);
router.get('/get/:id', getTermsConditionById);

module.exports = router;
