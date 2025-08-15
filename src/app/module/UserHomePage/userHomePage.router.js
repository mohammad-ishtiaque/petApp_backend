const express = require('express');
const { getServiceByType } = require('./userHomePage.controller');
const router = express.Router();

router.get('/getServiceByType/:type', getServiceByType);

module.exports = router;