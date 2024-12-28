const mongoose = require('mongoose')
const Order = require('../models/orderModel')
const Photographer = require('../models/photographerModel')
const UserType = require('../models/typeModel')
const asyncHandler = require('express-async-handler')
const ImageVault = require('../models/imagebase/imageVaultModel')
const GST = require('../models/gstModel')

const createOrder = asyncHandler(async (req, res) => {
  
  const { 
    userId, 
    imageInfo, 
    frameInfo, 
    paperInfo, 
    subTotal,
    paymentMethod, 
    shippingAddress,
    totalAmount,
    orderStatus,
    invoiceId,
  } = req.body;

  const image = await ImageVault.findById(imageInfo.image);
  if (!image) {
    return res.status(400).send({ message: 'Image not found' });
  }
  

  const photographer = await Photographer.findById(imageInfo.photographer);
  if (!photographer) {
    return res.status(400).send({ message: 'Photographer not found' });
  }
  const userType = await UserType.findOne({ user: userId }).select('type -_id')
  const type = userType?.type || null;

  const gst = await GST.findOne({ 'userInfo.user': userId  })
  const gstId = gst ? gst._id : null

  const orderData = {
    userInfo: {
      user: userId,
      userType: type
    },
    imageInfo: imageInfo,
    frameInfo,
    paperInfo,
    subTotal,
    gst: gstId,
    totalAmount,
    orderStatus,
    paymentMethod,
    shippingAddress,
    invoiceId,
    isPaid: true
  };

  const order = await Order.create(orderData);

  res.status(201).send(order);
});

const getAllOrders = asyncHandler(async(req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const orders = await Order.find({}).populate('imageInfo.image').populate('userInfo.user').sort({createdAt: -1}).skip((pageNumber - 1) * pageSize).limit(pageSize)

    if(!orders || orders.length === 0) return res.status(400).send({ message: 'Order not found' })

    const totalDocuments = await Order.countDocuments({})
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ orders, pageCount })
})

const getMyOrders = asyncHandler(async (req, res) => {
  const { userId, pageNumber = 1, pageSize = 20 } = req.query
  const orders = await Order.find({ 'userInfo.user': userId }).populate('imageInfo.image').skip((pageNumber - 1) * pageSize).limit(pageSize)

  if(!orders || orders.length === 0) {
    res.status(400)
    throw new Error('Order not found')
  }

  const totalDocuments = await Order.countDocuments({'userInfo.user': userId})
  const pageCount = Math.ceil(totalDocuments/pageSize)

  res.status(200).send({ orders, pageCount })

})

const getOrdersByPhotographer = asyncHandler(async (req, res) => {
    const { photographer, pageNumber = 1, pageSize = 20 } = req.query

    const orders = await Order.find({ 'imageInfo.photographer': photographer }).populate('imageInfo.image').skip((pageNumber - 1) * pageSize)

    if(!orders || orders.length === 0) {
      res.status(404)
      throw new Error('No Orders Found')
    }

    const totalDocuments = await Order.countDocuments({ 'imageInfo.photographer': photographer })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ orders, pageCount })

})



const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, orderId } = req.body

  if(!orderStatus || !orderId) {
    res.status(400)
    throw new Error('Order Status and Order Id is required to update')
  }

  const order = await Order.findById(orderId)
  const validStatusTypes = new Set(['pending', 'completed', 'cancelled'])
  if(!validStatusTypes.has(orderStatus)) {
    res.status(400)
    throw new Error('Invalid order status')
  }

  order.orderStatus = orderStatus

  if(orderStatus === 'cancelled' || orderStatus === 'pending') {
    order.isPaid = false
  } else {
    order.isPaid = true
  }
  
  await order.save()
  res.status(200).send({ message: 'Order status updated' })
})

const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.query

  if(!orderId) return res.status(400).send({ message: 'Order Id is required' })

  const order = await Order.findById(orderId).populate('imageInfo.image').populate('imageInfo.photographer')

  res.status(200).send({ order })
})

const getOrderByStatus = asyncHandler(async (req, res) => {
    const { status, pageNumber = 1, pageSize = 20 } = req.query

    const validStatusTypes = new Set(['pending', 'completed', 'cancelled']);
 
    if (!validStatusTypes.has(status?.toLowerCase())) {
        return res.status(400).json({status: false,  message: "Invalid Action" });
    }

    const orders = await Order.find({ orderStatus: status }).populate('imageInfo.image').populate('imageInfo.photographer').skip((pageNumber - 1) * pageSize).limit(pageNumber)

    if(!orders || orders.length === 0) {
      res.status(404)
      throw new Error('Order not found')
    }

    const totalDocuments = await Order.countDocuments({ orderStatus: status })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ orders, pageCount })


})

module.exports = {
    createOrder,
    getAllOrders,
    getMyOrders,
    getOrdersByPhotographer,
    getOrderByStatus,
    updateOrderStatus,
    getOrderById
}