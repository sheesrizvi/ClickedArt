const express = require('express')
const { generateInvoice,
    generateSingleOrderInvoice,
    getAllInvoicesByPhotographers, 
    updateInvoicePaymentStatus,
    deleteInvoice} = require('../controller/invoiceController.js')
const { isAdmin } = require('../middleware/authMiddleware.js')
const router = express.Router()

router.post('/generate-invoice', isAdmin, generateInvoice)
router.get('/generate-single-order-invoice', generateSingleOrderInvoice)
router.get('/get-invoice-by-photographers', getAllInvoicesByPhotographers)
router.post('/update-invoice-payment-status', isAdmin, updateInvoicePaymentStatus)
router.delete('/delete-invoice', deleteInvoice)

module.exports = router