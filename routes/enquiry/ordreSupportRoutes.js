const express = require('express')
const {isAdmin } = require('../../middleware/authMiddleware.js')
const {
    createOrderSupport,
    getPendingOrderSupportRequests,
    getResolvedOrderSupportRequests,
    getOrderSupportById,
    updateOrderSupport,
    deleteOrderSupport,
    changeOrderSupportStatus
} = require('../../controller/enquiry/orderSupportController.js')

const router = express.Router()


router.post('/create-order-support-request', createOrderSupport)
router.post('/update-order-support-request', updateOrderSupport)
router.get('/get-order-support-request-by-id', getOrderSupportById)
router.get('/get-pending-order-support-custom-request', getPendingOrderSupportRequests)
router.get('/get-resolved-order-support-request', getResolvedOrderSupportRequests)
router.delete('/delete-order-support-request', deleteOrderSupport)
router.post('/change-order-support-request-status', changeOrderSupportStatus)

module.exports = router