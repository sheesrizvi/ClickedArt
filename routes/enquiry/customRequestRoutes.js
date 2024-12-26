const express = require('express')
const {isAdmin } = require('../../middleware/authMiddleware.js')
const {
    createCustomRequest,
    getPendingCustomRequests,
    getResolvedCustomRequests,
    getCustomRequestById,
    updateCustomRequest,
    deleteCustomRequest,
    changeCustomRequestFormStatus
} = require('../../controller/enquiry/customRequestController.js')

const router = express.Router()

router.post('/create-custom-request', createCustomRequest)
router.post('/update-customer-request', updateCustomRequest)
router.get('/get-custom-request-by-id', getCustomRequestById)
router.get('/get-pending-custom-request', getPendingCustomRequests)
router.get('/get-resolved-custom-request', getResolvedCustomRequests)
router.delete('/delete-custom-request', deleteCustomRequest)
router.post('/change-custom-request-form-status', changeCustomRequestFormStatus)

module.exports = router