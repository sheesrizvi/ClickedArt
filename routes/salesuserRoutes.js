const express  = require("express");
const { 
    registerSalesUser,
    updateSalesUser,
    userLogin,
    getAllSalesUser,
    getSalesUserById,
    verifySalesUserProfile
 } = require('../controller/salesUserController.js')
const router = express.Router()

router.post('/register-sales-user', registerSalesUser)
router.post('/update-sales-user', updateSalesUser)
router.post('/login-sales-user', userLogin)
router.get('/get-all-sales-user', getAllSalesUser)
router.get('/get-sales-user-by-id', getSalesUserById)
router.post('/verify-sales-user-profile', verifySalesUserProfile)

module.exports = router