const express = require('express')
const {   
    createMonetization,
    getMonetizationByPhotographerId,
    updateMonetizationStatus,
    deleteMonetizationRequest,
    updateMonetization, 
    getAllMonetizations,
    getPendingMonetizations} = require('../controller/monetizationController.js')
const router = express.Router()
const { isAdmin } = require('../middleware/authMiddleware')

router.post('/create-monetization', createMonetization)
router.post('/update-monetization', updateMonetization)
router.get('/getMonetizationByPhotographerId', getMonetizationByPhotographerId)
router.post('/update-monetization-status',isAdmin, updateMonetizationStatus)
router.delete('/delete-monetization', deleteMonetizationRequest)
router.get('/get-all-monetizations', getAllMonetizations)
router.get('/get-pending-monetizations', getPendingMonetizations)

module.exports = router