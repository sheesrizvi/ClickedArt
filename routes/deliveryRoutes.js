const express = require('express')
const { checkPincodeAvailablity, registerDelivery, createShipment } = require('../controller/deliveryController.js')
const router = express.Router()

router.get('/check-pincode-availablity', checkPincodeAvailablity)
router.post('/generate-waybill', registerDelivery)
router.post('/create-shipment', createShipment)

module.exports = router