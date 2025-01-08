const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Photographer = require("../models/photographerModel");
const UserType = require("../models/typeModel");
const asyncHandler = require("express-async-handler");
const ImageVault = require("../models/imagebase/imageVaultModel");
const GST = require("../models/gstModel");
const Coupon = require("../models/couponModel");
const ReferralBalance = require("../models/referralBalanceModel");
const User = require("../models/userModel.js");
const Referral = require("../models/referralModel.js");
const Razorpay = require("razorpay");

const createOrder = asyncHandler(async (req, res) => {
  const {
    userId,
    imageInfo,
    frameInfo,
    paperInfo,
    subTotal,
    paymentMethod,
    shippingAddress,
    discount,
    totalAmount,
    orderStatus,
    invoiceId,
    coupon,
  } = req.body;

  const image = await ImageVault.findById(imageInfo.image);
  if (!image) {
    return res.status(400).send({ message: "Image not found" });
  }

  const photographer = await Photographer.findById(imageInfo.photographer);
  if (!photographer) {
    return res.status(400).send({ message: "Photographer not found" });
  }
  const userType = await UserType.findOne({ user: userId }).select("type -_id");
  const type = userType?.type || null;

  const gst = await GST.findOne({ "userInfo.user": userId });
  const gstId = gst ? gst._id : null;
  const orderExist = await Order.findOne({ "userInfo.user": userId });

  const orderData = {
    userInfo: {
      user: userId,
      userType: type,
    },
    imageInfo: imageInfo,
    frameInfo,
    paperInfo,
    subTotal,
    gst: gstId,
    totalAmount,
    discount,
    orderStatus,
    paymentMethod,
    shippingAddress,
    invoiceId,
    isPaid: true,
  };

  const order = await Order.create(orderData);

  if (coupon) {
    const couponData = await Coupon.findOne({ code: coupon });
    if (couponData) {
      couponData.usageCount += 1;
      couponData.users.push({
        user: userId,
        userType: type,
      });
      await couponData.save();
    }
  }

  const Model = type === "User" ? User : Photographer;
  const user = await Model.findOne({ _id: userId });

  if (user && user.referralcode && !orderExist) {
    const referral = await Referral.findOne({ code: user.referralcode });
    if (referral) {
      const commissionRate = referral.commissionRate;
      const price = order.totalAmount;
      const balance = Math.round(price * (commissionRate / 100));

      await ReferralBalance.create({
        photographer: referral.photographer,
        amount: balance,
      });
    }
  }

  res.status(201).send(order);
});

const getAllOrders = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;

  const orders = await Order.find({})
    .populate("imageInfo.image")
    .populate("userInfo.user")
    .populate("frameInfo.frame")
    .populate("paperInfo.paper")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  if (!orders || orders.length === 0)
    return res.status(400).send({ message: "Order not found" });

  const totalDocuments = await Order.countDocuments({});
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({ orders, pageCount });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { userId, pageNumber = 1, pageSize = 20 } = req.query;
  const orders = await Order.find({ "userInfo.user": userId })
    .populate("imageInfo.image")
    .populate("paperInfo.paper")
    .populate("frameInfo.frame")
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  if (!orders || orders.length === 0) {
    res.status(400);
    throw new Error("Order not found");
  }

  const totalDocuments = await Order.countDocuments({
    "userInfo.user": userId,
  });
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({ orders, pageCount });
});

const getOrdersByPhotographer = asyncHandler(async (req, res) => {
  const { photographer, pageNumber = 1, pageSize = 20 } = req.query;

  const orders = await Order.find({ "imageInfo.photographer": photographer })
    .populate("imageInfo.image")
    .populate("paperInfo.paper")
    .populate("frameInfo.frame")
    .skip((pageNumber - 1) * pageSize);

  if (!orders || orders.length === 0) {
    res.status(404);
    throw new Error("No Orders Found");
  }

  const totalDocuments = await Order.countDocuments({
    "imageInfo.photographer": photographer,
  });
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({ orders, pageCount });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, orderId } = req.body;

  if (!orderStatus || !orderId) {
    res.status(400);
    throw new Error("Order Status and Order Id is required to update");
  }

  const order = await Order.findById(orderId);
  const validStatusTypes = new Set(["pending", "completed", "cancelled"]);
  if (!validStatusTypes.has(orderStatus)) {
    res.status(400);
    throw new Error("Invalid order status");
  }

  order.orderStatus = orderStatus;

  if (orderStatus === "cancelled" || orderStatus === "pending") {
    order.isPaid = false;
  } else {
    order.isPaid = true;
  }

  await order.save();
  res.status(200).send({ message: "Order status updated" });
});

const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.query;

  if (!orderId)
    return res.status(400).send({ message: "Order Id is required" });

  const order = await Order.findById(orderId)
    .populate("imageInfo.image")
    .populate("imageInfo.photographer");

  res.status(200).send({ order });
});

const getOrderByStatus = asyncHandler(async (req, res) => {
  const { status, pageNumber = 1, pageSize = 20 } = req.query;

  const validStatusTypes = new Set(["pending", "completed", "cancelled"]);

  if (!validStatusTypes.has(status?.toLowerCase())) {
    return res.status(400).json({ status: false, message: "Invalid Action" });
  }

  const orders = await Order.find({ orderStatus: status })
    .populate("imageInfo.image")
    .populate("imageInfo.photographer")
    .populate("paperInfo.paper")
    .populate("frameInfo.frame")
    .skip((pageNumber - 1) * pageSize)
    .limit(pageNumber);

  if (!orders || orders.length === 0) {
    res.status(404);
    throw new Error("Order not found");
  }

  const totalDocuments = await Order.countDocuments({ orderStatus: status });
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).send({ orders, pageCount });
});

const payment = asyncHandler(async (req, res) => {
  const { total, userId } = req.body; // Access from req.body

  if (!total || !userId) {
    res.status(400).json({ message: "Total amount and user ID are required." });
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const instance = new Razorpay({
    key_id: process.env.RAZOR_PAY_ID,
    key_secret: process.env.RAZOR_PAY_SECRET,
  });

  const result = await instance.orders.create({
    amount: total * 100, // Convert amount to paise
    currency: "INR",
    receipt: `receipt_${userId}`,
    notes: {
      userId: user._id,
      key: process.env.RAZOR_PAY_ID,
    },
  });

  res.status(200).json({ result }); // Send response with result
});

module.exports = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrdersByPhotographer,
  getOrderByStatus,
  updateOrderStatus,
  getOrderById,
  payment,
};
