const express = require('express')
const { adminRegistration, adminLogin, createOtherAdmin, getAllAdmins, getAdminById, updateOtherAdmin, updateSuperAdmin, getOtherAdminTypes, deleteOtherAdminTypes } = require('../controller/adminController')
const { handlePhotographerStatusUpdate } = require('../controller/photographerController')
const { isAdmin, isSuperAdmin } = require('../middleware/authMiddleware')
const router = express.Router()


// Public Routes
router.post('/admin-register', adminRegistration)
router.post('/admin-login', adminLogin)
router.post('/handle-photographer-approval-status', isAdmin,  handlePhotographerStatusUpdate)
router.post('/create-other-admin', isSuperAdmin, createOtherAdmin)

router.get('/get-all-admins', getAllAdmins)
router.get('/get-admin-by-id', getAdminById)
router.get('/get-other-admins', getOtherAdminTypes)

router.post('/update-other-admin', isSuperAdmin, updateOtherAdmin)
router.post('/update-super-admin', isSuperAdmin, updateSuperAdmin)
router.delete('/delete-other-admin', isSuperAdmin, deleteOtherAdminTypes)

module.exports = router