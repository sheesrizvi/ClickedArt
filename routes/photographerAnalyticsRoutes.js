const express = require('express')
const { photographerDashboardData } = require('../controller/photographerAnalyticsController.js')
const router = express.Router()

router.get('/get-photographer-analytics', photographerDashboardData)

module.exports = router