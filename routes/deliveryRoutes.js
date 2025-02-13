const express = require('express')
const { checkPincodeAvailablity } = require('../controller/deliveryController.js')
const router = express.Router()

router.get('/check-pincode-availablity', checkPincodeAvailablity)

module.exports = router