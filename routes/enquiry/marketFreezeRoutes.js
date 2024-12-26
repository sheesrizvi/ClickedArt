const express = require('express')
const { 
    createMarketFreezeRequest,
    getPendingMarketFreezeRequests,
    getResolvedMarketFreezeRequests,
    getMarketFreezeRequestById,
    deleteMarketFreezeRequest,
    updateMarketFreezeRequestStatus  } = require('../../controller/enquiry/marketFreezeController.js')

const {isAdmin } = require('../../middleware/authMiddleware.js')

const router = express.Router()

router.post('/create-market-freeze-request', createMarketFreezeRequest)
router.post('/update-market-freeze-request-status', isAdmin, updateMarketFreezeRequestStatus)
router.get('/get-pending-market-freeze-requests', getPendingMarketFreezeRequests)
router.get('/get-approved-market-freeze-requests', getResolvedMarketFreezeRequests)
router.get('/get-market-freeze-request-by-id', getMarketFreezeRequestById)
router.delete('/delete-market-freeze-request', isAdmin, deleteMarketFreezeRequest)


module.exports = router