const express = require('express')
const { 
    createGstDetails,
    updateGstDetails,
    deleteGstDetails,
    getGSTDetailsByUser,
    getAllGSTDetails } = require('../controller/gstController')
const router = express.Router()
const { verifyToken } = require('../middleware/authMiddleware.js')

router.post('/add-gst', verifyToken, createGstDetails)
router.post('/update-gst', verifyToken, updateGstDetails)
router.delete('/delete-gst', verifyToken, deleteGstDetails)
router.get('/get-gst-details-by-user', getGSTDetailsByUser)
router.get('/get-all-gst', getAllGSTDetails)

module.exports = router