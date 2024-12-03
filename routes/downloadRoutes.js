const express = require('express')
const { createOrder ,
    getAllOrders,
    getMyOrders,
    getOrdersByPhotographer,
    getOrderByStatus,
    updateOrderStatus,
    getOrderById
 } = require('../controller/orderController')
const router = express.Router()

router.post('/create-order', createOrder)
router.get('/get-all-orders', getAllOrders)
router.get('/get-my-orders', getMyOrders)
router.get('/get-orders-by-photographer', getOrdersByPhotographer)
router.get('/get-order-by-status', getOrderByStatus)
router.get('/get-order-by-id', getOrderById)
router.post('/update-order-status', updateOrderStatus)

module.exports = router