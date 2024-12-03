const express = require('express')
const { 
    createGstDetails,
    updateGstDetails,
    deleteGstDetails,
    getGSTDetailsByUser,
    getAllGSTDetails } = require('../controller/gstController')
const router = express.Router()

router.post('/add-gst', createGstDetails)
router.post('/update-gst', updateGstDetails)
router.delete('/delete-gst', deleteGstDetails)
router.get('/get-gst-details-by-user', getGSTDetailsByUser)
router.get('/get-all-gst', getAllGSTDetails)

module.exports = router