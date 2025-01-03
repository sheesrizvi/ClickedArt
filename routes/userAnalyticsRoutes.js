const express = require('express')
const { userDashboardData } = require('../controller/userAnalyticsController.js')

const router = express.Router()

router.get('/get-user-dashboard-data', userDashboardData)

module.exports = router

