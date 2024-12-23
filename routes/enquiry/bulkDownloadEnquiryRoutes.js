const express = require('express')
const {  
    createEnquiry,
    getEnquiries,
    getEnquiryById,
    updateEnquiryStatus,
    deleteEnquiry, 
} = require('../../controller/enquiry/bulkDownloadEnquiryController.js')

const {isAdmin } = require('../../middleware/authMiddleware.js')

const router = express.Router()

router.post('/create-enquiry', createEnquiry)
router.post('/update-enquiry-status', isAdmin, updateEnquiryStatus)
router.get('/get-enquiry-by-id', getEnquiryById)
router.get('/get-enquiries', getEnquiries)
router.delete('/delete-enquiry', isAdmin, deleteEnquiry)


module.exports = router