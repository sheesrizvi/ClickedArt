const express = require('express')
const { createOrder ,
    getAllOrders,
    getMyOrders,
    getOrdersByPhotographer,
    getOrderByStatus,
    updateOrderStatus,
    getOrderById,
    payment,
    getPendingOrders
 } = require('../controller/orderController')
const router = express.Router()
const { verifyToken, isAdmin } = require('../middleware/authMiddleware.js')

router.post('/create-order', verifyToken, createOrder)
router.get('/get-all-orders', getAllOrders)
router.get('/get-my-orders', getMyOrders)
router.get('/get-orders-by-photographer', getOrdersByPhotographer)
router.get('/get-order-by-status', getOrderByStatus)
router.get('/get-order-by-id', getOrderById)
router.post('/update-order-status', isAdmin, updateOrderStatus)
router.post('/payment', payment)
router.get('/get-pending-orders', getPendingOrders)

module.exports = router