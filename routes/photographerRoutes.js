const express = require('express')
const { registerPhotographer, photographerLogin, resetPassword, getAllPhotographers, getPhotographerById, getAllPendingPhotographersForAdmin, updatePhotographer, updatePhotographerRank, getFeaturedPhotographer,
    toggleFeaturedPhotographer, verifyPhotographerProfile,
    searchPhotographers,
    getPhotographerByUserName,
    updateCoverImage,
    checkPhotographerUserNameExist,
    changePassword, resendOTP
 } = require('../controller/photographerController')
const { IsPhotographer, isAdmin } = require('../middleware/authMiddleware')
// const { resendOTP } = require('../controller/userController')
const router = express.Router()



router.post('/register', registerPhotographer)
router.post('/login', photographerLogin)
router.post('/update-profile', updatePhotographer)
router.post('/reset-password', IsPhotographer, resetPassword)
router.get('/get-all-photographers', getAllPhotographers)
router.get('/get-photographer-by-id', getPhotographerById)
router.get('/get-all-pending-photographers-for-admin', isAdmin, getAllPendingPhotographersForAdmin)
router.post('/update-photographer-rank', updatePhotographerRank)
router.post('/toggle-featured-photographer', isAdmin, toggleFeaturedPhotographer)
router.post('/verify-photographer-profile', verifyPhotographerProfile)
router.get('/get-featured-photographers', getFeaturedPhotographer)
router.post('/resent-otp', resendOTP)
router.get('/search-photographer', searchPhotographers)
router.get('/get-photographer-by-username', getPhotographerByUserName)
router.post('/update-cover-image', updateCoverImage)
router.post('/checkUsernameAndEmailExists', checkPhotographerUserNameExist)
router.post('/change-password', changePassword)

module.exports = router