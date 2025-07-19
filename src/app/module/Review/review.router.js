const express = require('express');
const router = express.Router();

const { createReview, getReview, getAllReviewsByBusinessId, getAllReviewsByServiceId } = require('./review.controller');

const { authenticateUser } = require('../../middleware/auth.middleware');

router.post('/create-review', authenticateUser, createReview);
router.get('/get-review/:id', authenticateUser, getReview);
router.get('/get-all-reviews-by-business/:id', authenticateUser, getAllReviewsByBusinessId);
router.get('/get-all-reviews-by-service/:id', authenticateUser, getAllReviewsByServiceId);

module.exports = router;

 