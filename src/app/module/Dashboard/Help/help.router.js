const express = require('express');
const router = express.Router();
const { createHelp, getAllHelps, updateHelp, deleteHelp, getHelpById } = require('./help.controller');
const { authenticateOwnerAndUser } = require('../../../middleware/auth.middleware');

router.post('/create', authenticateOwnerAndUser, createHelp);
router.get('/get', getAllHelps);
router.put('/update/:id', updateHelp);
router.delete('/delete/:id', deleteHelp);
router.get('/get/:id', getHelpById);

module.exports = router;