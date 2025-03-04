const express = require('express')
const { checkPincodeAvailablity, registerDelivery, createShipment, getPackageDetails, registerDeliveryManually, raisePickupRequest, generateShippingLabel } = require('../controller/deliveryController.js')
const router = express.Router()

router.get('/check-pincode-availablity', checkPincodeAvailablity)
router.post('/generate-waybill', registerDelivery)
router.post('/create-shipment', createShipment)
router.get('/track-shipment', getPackageDetails)
router.post('/register-delivery-manually', registerDeliveryManually)
router.post('/raise-pickup-request', raisePickupRequest)
router.post('/generate-shipping-label', generateShippingLabel)

module.exports = router