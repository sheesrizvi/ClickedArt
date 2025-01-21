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
const Paper = require("../models/imagebase/paperModel");
const Frame = require('../models/imagebase/frameModel.js')
const Razorpay = require("razorpay");
const Monetization = require('../models/monetizationModel.js')
const ImageAnalytics = require('../models/imagebase/imageAnalyticsModel.js')
const { sendOrderThankYouMail } = require('../middleware/handleEmail.js')
const moment = require('moment');


const createOrder = asyncHandler(async (req, res) => {
 
  const {
    userId,
    orderItems,
    paymentMethod,
    shippingAddress,
    discount,
    finalAmount,
    orderStatus,
    invoiceId,
    coupon,
    isPaid,
    gst
  } = req.body;

  
 
  const userType = await UserType.findOne({ user: userId }).select("type -_id");
  const type = userType?.type || null;

  console.log(type)
  const orderExist = await Order.findOne({ "userInfo.user": userId });
 

  const groupedOrders = orderItems.reduce((acc, item) => {

    const photographerId = item.imageInfo?.photographer || 'print'; 
    if (!acc[photographerId]) {
      acc[photographerId] = [];
    }
    acc[photographerId].push(item);
    return acc;
  }, {});


  const orders = [];
  for (const [key, items] of Object.entries(groupedOrders)) {
    const totalAmount = items.reduce((sum, item) => sum + (item.finalPrice || 0), 0); 

    
    const order = new Order({
      userInfo: {
        user: userId,
        userType: type
      },
      orderItems: items,
      paymentMethod,
      shippingAddress,
      discount,
      totalAmount,
      orderStatus,
      invoiceId,
      finalAmount,
      isPaid,
      gst
    });


    const savedOrder = await order.save();
    orders.push(savedOrder);
  }

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
      const price = orders[0].totalAmount;
      const balance = Math.round(price * (commissionRate / 100));

      await ReferralBalance.create({
        photographer: referral.photographer,
        amount: balance,
      });
    }
  }
  
  const customerName = `${user.firstName} ${user.lastName}`
  const customerEmail = user.email
  const orderDate = moment().format('dddd, MMMM Do YYYY');
  let itemNames = [];

  for (let item of orderItems) {
    if (item.imageInfo && item.imageInfo.image) {
      const image = await ImageVault.findById(item.imageInfo.image).select('name');
      if (image && image.title) {
        itemNames.push(image.title);
      }
      if(image && image._id) {
        const downloads = await Order.countDocuments({ 'imageInfo.image': image._id })
        await ImageAnalytics.findOneAndUpdate({ image: image._id }, {
          downloads
        })
      }
    }

    if (item.frameInfo && item.frameInfo.frame) {
      const frame = await Frame.findById(item.frameInfo.frame).select('name');
      if (frame && frame.name) {
        itemNames.push(frame.name);
      }
    }

    if (item.paperInfo && item.paperInfo.paper) {
      const paper = await Paper.findById(item.paperInfo.paper).select('name');
      if (paper && paper.name) {
        itemNames.push(paper.name);
      }
    }
  }
  const items = itemNames
  await sendOrderThankYouMail(customerName, orderDate, items, customerEmail)

  

  res.status(201).send(orders);

});




const getAllOrders = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;

  const orders = await Order.find({})
    .populate({
      path: 'orderItems',
      populate: [
        {
          path: 'imageInfo.image',
          populate: {
            path: 'photographer'
          }
        },
        {
          path: 'frameInfo.frame'
        },
        {
          path: 'paperInfo.paper'
        },
        {
          path: 'imageInfo.photographer'
        }
      ]
    })
    .populate("userInfo.user")
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
  .populate({
    path: 'orderItems',
    populate: [
      {
        path: 'imageInfo.image',
        populate: {
          path: 'photographer'
        }
      },
      {
        path: 'frameInfo.frame'
      },
      {
        path: 'paperInfo.paper'
      },
      {
        path: 'imageInfo.photographer'
      }
    ]
  })
  .populate("userInfo.user")
  .sort({ createdAt: -1 })
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

  const orders = await Order.find({ "orderItems.imageInfo.photographer": photographer })
    .populate({
      path: 'orderItems',
      populate: [
        {
          path: 'imageInfo.image',
          populate: {
            path: 'photographer'
          }
        },
        {
          path: 'frameInfo.frame'
        },
        {
          path: 'paperInfo.paper'
        },
        {
          path: 'imageInfo.photographer'
        }
      ]
    })
    .populate("userInfo.user")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize);

  if (!orders || orders.length === 0) {
    res.status(404);
    throw new Error("No Orders Found");
  }

  const totalDocuments = await Order.countDocuments({
    "orderItems.imageInfo.photographer": photographer,
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
  .populate({
    path: 'orderItems',
    populate: [
      {
        path: 'imageInfo.image',
        populate: {
          path: 'photographer'
        }
      },
      {
        path: 'frameInfo.frame'
      },
      {
        path: 'paperInfo.paper'
      },
      {
        path: 'imageInfo.photographer'
      }
    ]
  })
  .populate("userInfo.user")

  res.status(200).send({ order });
});

const getOrderByStatus = asyncHandler(async (req, res) => {
  const { status, pageNumber = 1, pageSize = 20 } = req.query;

  const validStatusTypes = new Set(["pending", "completed", "cancelled"]);

  if (!validStatusTypes.has(status?.toLowerCase())) {
    return res.status(400).json({ status: false, message: "Invalid Action" });
  }

  const orders = await Order.find({ orderStatus: status })
  .populate({
    path: 'orderItems',
    populate: [
      {
        path: 'imageInfo.image',
        populate: {
          path: 'photographer'
        }
      },
      {
        path: 'frameInfo.frame'
      },
      {
        path: 'paperInfo.paper'
      },
      {
        path: 'imageInfo.photographer'
      }
    ]
  })
  .populate("userInfo.user")
  .sort({ createdAt: -1 })
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
    amount: Math.round(total * 100), // Convert amount to paise
    currency: "INR",
    receipt: `receipt_${userId}`,
    notes: {
      userId: user._id,
      key: process.env.RAZOR_PAY_ID,
    },
  });

  res.status(200).json({ result });
});

const getPendingOrders = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query

  const orders = await Order.find({ orderStatus: 'pending' })
  .populate({
    path: 'orderItems',
    populate: [
      {
        path: 'imageInfo.image',
        populate: {
          path: 'photographer'
        }
      },
      {
        path: 'frameInfo.frame'
      },
      {
        path: 'paperInfo.paper'
      },
      {
        path: 'imageInfo.photographer'
      }
    ]
  })
  .populate("userInfo.user")
  .sort({ createdAt: -1 })
  .skip((pageNumber - 1) * pageSize)
  .limit(pageSize);

if (!orders || orders.length === 0)
  return res.status(400).send({ message: "Order not found" });

const totalDocuments = await Order.countDocuments({ orderStatus: 'pending' });
const pageCount = Math.ceil(totalDocuments / pageSize);

res.status(200).send({ orders, pageCount })
})

const calculateCartPrice = async (req, res) => {
  try {
    const { items, userId } = req.body;

    let totalImagePrice = 0;
    let totalPaperPrice = 0;
    let totalFramePrice = 0;
    let totalFinalPrice = 0;

    const frameIds = items?.filter(item => item.frameId).map(item => item.frameId);
    const paperIds = items?.filter(item => item.paperId).map(item => item.paperId);

    const frames = await Frame.find({ '_id': { $in: frameIds } });
    const papers = await Paper.find({ '_id': { $in: paperIds } });

    for (let item of items) {
      const { imageId, paperId, frameId, width, height, resolution } = item;

      const image = await ImageVault.findById(imageId);
      if (!image) continue;

      const imagePrice = resolution === "small" ? image.price.small : (resolution === "medium" ? image.price.medium : image.price.original);

      let paperPrice = 0;
      let framePrice = 0;

      if (paperId) {
        const paper = papers.find(p => p._id.toString() === paperId);
        if (paper) {
          const customDimension = paper.customDimensions.find(
            (dim) => dim.width === width && dim.height === height
          );

          if (customDimension) {
            paperPrice = customDimension.price;
          } else {
            const area = width * height;
            paperPrice = area * paper.basePricePerSquareInch;
          }
        }
      }

      if (frameId) {
        const frame = frames.find(f => f._id.toString() === frameId);
        if (frame) {
          const frameArea = width * height;
          framePrice = frameArea * frame.basePricePerLinearInch;
        }
      }

      totalImagePrice += imagePrice;
      totalPaperPrice += paperPrice;
      totalFramePrice += framePrice;
      totalFinalPrice += imagePrice + paperPrice + framePrice;
    }

    res.json({
      totalImagePrice,
      totalPaperPrice,
      totalFramePrice,
      totalFinalPrice
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};



module.exports = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrdersByPhotographer,
  getOrderByStatus,
  updateOrderStatus,
  getOrderById,
  payment,
  getPendingOrders,
  calculateCartPrice
};
