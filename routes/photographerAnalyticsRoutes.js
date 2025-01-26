const express = require('express')
const { photographerDashboardData, customPhotographerRevenueData } = require('../controller/photographerAnalyticsController.js')
const router = express.Router()

router.get('/get-photographer-analytics', photographerDashboardData)
router.get('/custom-analytics-by-date', customPhotographerRevenueData)

module.exports = router