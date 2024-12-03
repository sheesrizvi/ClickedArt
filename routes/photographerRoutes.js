const express = require('express')
const { registerPhotographer, photographerLogin, resetPassword, getAllPhotographers, getPhotographerById, getAllPendingPhotographersForAdmin } = require('../controller/photographerController')
const { IsPhotographer, isAdmin } = require('../middleware/authMiddleware')
const router = express.Router()



router.post('/register', registerPhotographer)
router.post('/login', photographerLogin)
router.post('/reset-password', IsPhotographer, resetPassword)
router.get('/get-all-photographers', getAllPhotographers)
router.get('/get-photographer-by-id', getPhotographerById)
router.get('/get-all-pending-photographers-for-admin', isAdmin, getAllPendingPhotographersForAdmin)

module.exports = router