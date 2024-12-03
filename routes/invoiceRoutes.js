const express = require('express')
const { generateInvoice,
    generateSingleOrderInvoice,
    getAllInvoicesByPhotographers } = require('../controller/invoiceController.js')
const { isAdmin } = require('../middleware/authMiddleware.js')
const router = express.Router()

router.post('/generate-invoice', isAdmin, generateInvoice)
router.get('/generate-single-order-invoice', generateSingleOrderInvoice)
router.get('/get-invoice-by-photographers', getAllInvoicesByPhotographers)

module.exports = router