const express = require('express');
const router = express.Router();

const { createReview, getReview, getAllReviewsByBusinessId, getAllReviewsByServiceId } = require('./review.controller');

const { authenticateUser, authenticateOwner } = require('../../middleware/auth.middleware');

router.post('/create', authenticateUser, createReview);
router.get('/get/:id', authenticateUser, getReview);
router.get('/get-all-reviews-by-business/:id', authenticateOwner, getAllReviewsByBusinessId);
router.get('/get-all-reviews-by-service/:id', authenticateOwner, getAllReviewsByServiceId);

module.exports = router;

 