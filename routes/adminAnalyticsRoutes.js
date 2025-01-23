const express = require('express')
const { isAdmin, isSuperAdmin } = require('../middleware/authMiddleware')
const { 
    getRevenueOverview,
    getSalesDataMetrics,
    getCustomerInsights,
    getPhotographerEarnings,
    revenueByCategory,
 } = require('../controller/adminAnalyticsController.js')
const router = express.Router()

router.get('/get-revenue-overview', getRevenueOverview)
router.get('/get-revenue-by-time', revenueByCategory)
router.get('/get-sales-metrics', getSalesDataMetrics)
router.get('/get-customer-insights', getCustomerInsights)
router.get('/get-photographer-earnings', getPhotographerEarnings)

module.exports = router