const express = require('express')
const { adminRegistration, adminLogin, createOtherAdmin } = require('../controller/adminController')
const { handlePhotographerStatusUpdate } = require('../controller/photographerController')
const { isAdmin } = require('../middleware/authMiddleware')
const router = express.Router()


// Public Routes
router.post('/admin-register', adminRegistration)
router.post('/admin-login', adminLogin)
router.post('/handle-photographer-approval-status', isAdmin,  handlePhotographerStatusUpdate)
router.post('/create-other-admin', isAdmin, createOtherAdmin)

module.exports = router