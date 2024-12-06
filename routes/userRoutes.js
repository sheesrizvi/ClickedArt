const express  = require("express");
const { userRegistration, userLogin, resetPassword, getAllUsers, getUserById, userProfileUpdate, deleteUserProfile } = require("../controller/userController.js");
const { verifyToken } = require("../middleware/authMiddleware.js");

const router = express.Router()


// Public Routes
router.post('/register', userRegistration)
router.post('/login', userLogin)
router.post('/update-profile', verifyToken, userProfileUpdate)

router.post('/reset-password', resetPassword)
router.get('/get-all-users', getAllUsers)
router.get('/get-user-by-id', getUserById)
router.delete('/delete-profile', deleteUserProfile)

module.exports = router