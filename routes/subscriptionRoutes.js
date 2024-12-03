const express = require('express');
const router = express.Router();
const { createSubscription, getUserSubscriptions, cancelSubscriptions } = require('../controller/subscriptionController');

router.post('/add-subscription', createSubscription);
router.get('/get-user-subscription', getUserSubscriptions);
router.post('/cancel-subscription', cancelSubscriptions);

module.exports = router;
