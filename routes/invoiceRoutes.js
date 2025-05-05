const express = require('express')
const { generateInvoice,
    generateSingleOrderInvoice,
    getAllInvoicesByPhotographers, 
    updateInvoicePaymentStatus,
    getInvoiceById,
    deleteInvoice,
    getAllInvoices} = require('../controller/invoiceController.js')
const { isAdmin } = require('../middleware/authMiddleware.js')
const router = express.Router()

router.post('/generate-invoice', isAdmin, generateInvoice)
router.get('/generate-single-order-invoice', generateSingleOrderInvoice)
router.get('/get-invoice-by-photographers', getAllInvoicesByPhotographers)
router.get('/get-all-invoices', getAllInvoices)
router.get('/get-invoice-by-id', getInvoiceById)
router.post('/update-invoice-payment-status', isAdmin, updateInvoicePaymentStatus)
router.delete('/delete-invoice', deleteInvoice)


module.exports = router