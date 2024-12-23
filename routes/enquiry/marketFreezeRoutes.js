const express = require('express')
const { 
    createMarketFreezeRequest,
    getMarketFreezeRequests,
    getMarketFreezeRequestById,
    deleteMarketFreezeRequest,
    updateMarketFreezeRequestStatus  } = require('../../controller/enquiry/marketFreezeController.js')

const {isAdmin } = require('../../middleware/authMiddleware.js')

const router = express.Router()

router.post('/create-market-freeze-request', createMarketFreezeRequest)
router.post('/update-market-freeze-request-status', isAdmin, updateMarketFreezeRequestStatus)
router.get('/get-market-freeze-requests', getMarketFreezeRequests)
router.get('/get-market-freeze-request-by-id', getMarketFreezeRequestById)
router.delete('/delete-market-freeze-request', isAdmin, deleteMarketFreezeRequest)


module.exports = router