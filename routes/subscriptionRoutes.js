const express = require('express');
const router = express.Router();
const { createSubscription, getUserSubscriptions, cancelSubscriptions, payment } = require('../controller/subscriptionController');
const { verifyToken } = require('../middleware/authMiddleware');


router.post('/add-subscription',verifyToken, createSubscription);
router.get('/get-user-subscription', getUserSubscriptions);
router.post('/cancel-subscription', cancelSubscriptions);
router.post('/payment', payment);

module.exports = router;
