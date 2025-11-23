const express = require('express');
const router = express.Router();
const webhookController = require('./webhook.controller');

router.post('/revenuecat', webhookController.handleRevenueCatWebhook);

module.exports = router;
