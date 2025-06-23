const express = require('express');

const router = express.Router();

const authController = require('./auth.controller');


router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-code', authController.verifyCode);

module.exports = router;