const express = require('express')
const {  
    createEnquiry,
    getPendingEnquiries,
    getApprovedEnquiries,
    getEnquiryById,
    updateEnquiryStatus,
    deleteEnquiry,
    getMyEnquiry,
    updateEnquiry, 
} = require('../../controller/enquiry/bulkDownloadEnquiryController.js')

const {isAdmin } = require('../../middleware/authMiddleware.js')

const router = express.Router()

router.post('/create-enquiry', createEnquiry)
router.post('/update-enquiry-status', isAdmin, updateEnquiryStatus)
router.post('/update-enquiry', updateEnquiry)
router.get('/get-enquiry-by-id', getEnquiryById)
router.get('/get-pending-enquiries', getPendingEnquiries)
router.get('/get-approved-enquiries', getApprovedEnquiries)
router.delete('/delete-enquiry', isAdmin, deleteEnquiry)
router.get('/get-my-enquiry', getMyEnquiry)

module.exports = router