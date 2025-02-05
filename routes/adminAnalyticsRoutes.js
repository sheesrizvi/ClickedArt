const express = require('express')
const { isAdmin, isSuperAdmin } = require('../middleware/authMiddleware')
const { 
    getRevenueOverview,
    getSalesDataMetrics,
    getCustomerInsights,
    getPhotographerEarnings,
    revenueByCategory,
    getSubsAnalytics,
    getReferralDetailsBySalesUser,
    getReferralDetailsByDate
 } = require('../controller/adminAnalyticsController.js')
const { masterDataController, documentCountsForAdmin } = require('../controller/masterDataController.js')
const router = express.Router()

router.get('/get-revenue-overview', getRevenueOverview)
router.get('/get-revenue-by-time', revenueByCategory)
router.get('/get-sales-metrics', getSalesDataMetrics)
router.get('/get-customer-insights', getCustomerInsights)
router.get('/get-photographer-earnings', getPhotographerEarnings)
router.get('/get-master-data', masterDataController)

router.get('/get-features-count', documentCountsForAdmin)
router.get('/get-subs-analytics', getSubsAnalytics)
router.get('/get-referral-details-by-sales-user', getReferralDetailsBySalesUser)


module.exports = router