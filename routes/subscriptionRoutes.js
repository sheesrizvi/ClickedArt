const express = require('express');
const router = express.Router();
const { createSubscription, getUserSubscriptions, cancelSubscriptions, payment, getUserActiveSubscription,          upgradeSubscriptionByAdminWithRank,
    upgradeSubscriptionByAdmin,
    upgradeUserSubscription } = require('../controller/subscriptionController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware')


router.post('/add-subscription',verifyToken, createSubscription);
router.get('/get-user-subscription', getUserSubscriptions);
router.post('/cancel-subscription', cancelSubscriptions);
router.post('/payment', payment);
router.get('/get-user-active-subscription', getUserActiveSubscription)

router.post('/upgrade-photographer-subs-by-admin-with-rank', isAdmin, upgradeSubscriptionByAdminWithRank)
router.post('/upgrade-photographer-subs-by-admin', isAdmin, upgradeSubscriptionByAdmin)
router.post('/upgrade-user-subscription', verifyToken, upgradeUserSubscription)
router.post('/update-to-free-subscriptions', )
module.exports = router;
