const express  = require("express");
const { userRegistration, userLogin, resetPassword, getAllUsers, getUserById, userProfileUpdate, deleteUserProfile, verifyUserProfile, resendOTP, getUserByUserName } = require("../controller/userController.js");
const { verifyToken } = require("../middleware/authMiddleware.js");

const router = express.Router()


// Public Routes
router.post('/register', userRegistration)
router.post('/login', userLogin)
router.post('/update-profile', verifyToken, userProfileUpdate)
router.post('/verify-user-profile', verifyUserProfile)
router.post('/reset-password', resetPassword)
router.post('/resent-otp', resendOTP)
router.get('/get-all-users', getAllUsers)
router.get('/get-user-by-id', getUserById)
router.delete('/delete-profile', deleteUserProfile)
router.get('/get-user-by-username', getUserByUserName)


module.exports = router