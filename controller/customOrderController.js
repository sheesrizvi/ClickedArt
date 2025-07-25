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
const Frame = require("../models/imagebase/frameModel.js");
const Razorpay = require("razorpay");
const Monetization = require("../models/monetizationModel.js");
const ImageAnalytics = require("../models/imagebase/imageAnalyticsModel.js");
const { sendOrderThankYouMail } = require("../middleware/handleEmail.js");
const BuyerCounter = require("../models/buyerCounterModel.js");
const moment = require("moment");
const { registerDeliveryFromOrder, registerCustomDeliveryFromOrder } = require('../controller/deliveryController.js')
const CustomImageOrder = require('../models/customOrderModel.js')

const getCounter = async (financialYear) => {
  const counterDoc = await BuyerCounter.findOne({ financialYear }).sort({
    createdAt: -1,
  });
  if (!counterDoc) {
    await BuyerCounter.create({ financialYear, counter: 0 });
    return 1;
  }
  return counterDoc.counter + 1;
};

const incrementCounter = async (financialYear) => {
  await BuyerCounter.findOneAndUpdate(
    { financialYear },
    { $inc: { counter: 1 } },
    { new: true }
  );
  return;
};

// const createCustomUploadOrder = asyncHandler(async (req, res) => {
//   const {
//     userId,
//     orderItems,
//     paymentMethod,
//     shippingAddress,
//     isPaid = true,
//     invoiceId,
//     coupon,
//     orderStatus = 'pending',
//   } = req.body;


//   const userTypeData = await UserType.findOne({ user: userId }).select('type -_id');
//   const userType = userTypeData?.type || 'User';

//   const today = new Date();
//   const currentYear = today.getFullYear();
//   const currentMonth = today.getMonth();
//   const financialYear =
//     currentMonth < 3
//       ? `${currentYear - 1}-${currentYear.toString().slice(-2)}`
//       : `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

//   const nextCounter = await getCounter(financialYear);
//   const invoiceNumber = `CUO/${financialYear}/${String(nextCounter).padStart(4, '0')}`;

//   let totalAmount = 0;
//   let discount = 0;

//   const updatedItems = orderItems.map((item) => {
//     const finalPrice = item.finalPrice || item.subTotal || 0;
//     const sgst = finalPrice * 0.09;
//     const cgst = finalPrice * 0.09;
//     const totalGST = sgst + cgst;

//     discount += (item.frameInfo?.discount || 0) + (item.paperInfo?.discount || 0);

//     totalAmount += finalPrice;

//     return {
//       ...item,
//       sgst,
//       cgst,
//       totalGST,
//     };
//   });

//   const finalAmount = totalAmount;


//   const newOrder = new CustomImageOrder({
//     user: userId,
//     userType,
//     orderItems: updatedItems,
//     quantity: updatedItems.length,
//     orderStatus,
//     printStatus: 'processing',
//     isPaid,
//     paymentMethod,
//     invoiceId,
//     invoiceNumber,
//     shippingAddress,
//     totalAmount,
//     finalAmount,
//     discount,
//   });

//   const savedOrder = await newOrder.save();

//   await incrementCounter(financialYear);


//   if (coupon) {
//     const couponData = await Coupon.findOne({ code: coupon });
//     if (couponData) {
//       couponData.usageCount += 1;
//       couponData.users.push({ user: userId, userType });
//       await couponData.save();
//     }
//   }


//   const orderExists = await CustomImageOrder.findOne({ user: userId, _id: { $ne: savedOrder._id } });

//   const user = await User.findById(userId);

// //   if (user && user.referralcode && !orderExists) {
// //     const referral = await Referral.findOne({ code: user.referralcode });

// //     if (referral && referral.applicableTo === 'user') {
// //       const price = (finalAmount * 100) / 118;
// //       const balance = Math.round(price * (referral.commissionRate / 100));

// //       await ReferralBalance.create({
// //         photographer: referral.photographer,
// //         amount: balance,
// //       });
// //     }
// //   }


//   const itemNames = [];

//   for (let item of orderItems) {
//     if (item.frameInfo?.frame) {
//       const frame = await Frame.findById(item.frameInfo.frame).select('name');
//       if (frame?.name) itemNames.push(`Frame: ${frame.name}`);
//     }
//     if (item.paperInfo?.paper) {
//       const paper = await Paper.findById(item.paperInfo.paper).select('name');
//       if (paper?.name) itemNames.push(`Paper: ${paper.name}`);
//     }
//   }

//   const orderDate = moment().format('dddd, MMMM Do YYYY');
//   const s3Link = `https://clickedart.com/bill/${savedOrder._id}`;

//   await sendOrderThankYouMail(
//     `${user.firstName} ${user.lastName}`,
//     orderDate,
//     itemNames,
//     user.email,
//     [s3Link]
//   );

//   // for (const ord of orders) {
//   //       const order = await CustomImageOrder.findOne({ _id: ord._id }).populate('userInfo.user');
        
//   //       if (!order) {
//   //         console.error(`Order not found for ID: ${ord._id}`);
//   //         continue; 
//   //       }
  
//   //       if(order.printStatus === 'no-print') {
//   //         continue;
//   //       }
    
//   //      console.log("Fetched Order:", order);
//   //      await registerDeliveryFromOrder(order);
//   //   }
    

//   res.status(201).json(savedOrder);
// });

const createCustomUploadOrder = asyncHandler(async (req, res) => {
  const {
    userId,
    orderItems,
    paymentMethod,
    shippingAddress,
    isPaid = true,
    invoiceId,
    coupon,
    orderStatus = 'pending',
  } = req.body;

  const userTypeData = await UserType.findOne({ user: userId }).select('type -_id');
  const userType = userTypeData?.type || 'User';

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const financialYear =
    currentMonth < 3
      ? `${currentYear - 1}-${currentYear.toString().slice(-2)}`
      : `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

  const orders = [];

  for (const item of orderItems) {
    const finalPrice = item.finalPrice || item.subTotal || 0;
    const sgst = finalPrice * 0.09;
    const cgst = finalPrice * 0.09;
    const totalGST = sgst + cgst;

    const nextCounter = await getCounter(financialYear);
    const invoiceNumber = `CUO/${financialYear}/${String(nextCounter).padStart(4, '0')}`;
    await incrementCounter(financialYear);

    const discount = (item.frameInfo?.discount || 0) + (item.paperInfo?.discount || 0);
    const totalAmount = finalPrice;
    const finalAmount = totalAmount;

    const newOrder = new CustomImageOrder({
      userInfo: {
        user: userId,
        userType,
      },
      orderItems: [
        {
          ...item,
          sgst,
          cgst,
          totalGST,
        },
      ],
      quantity: 1,
      orderStatus,
      printStatus: 'processing',
      isPaid,
      paymentMethod,
      invoiceId,
      invoiceNumber,
      shippingAddress,
      totalAmount,
      finalAmount,
      discount,
    });

    const savedOrder = await newOrder.save();
    orders.push(savedOrder);
  }

  if (coupon) {
    const couponData = await Coupon.findOne({ code: coupon });
    if (couponData) {
      couponData.usageCount += 1;
      couponData.users.push({ user: userId, userType });
      await couponData.save();
    }
  }

  const user = await User.findById(userId);

  const itemNames = [];

  for (let item of orderItems) {
    if (item.frameInfo?.frame) {
      const frame = await Frame.findById(item.frameInfo.frame).select('name');
      if (frame?.name) itemNames.push(`Frame: ${frame.name}`);
    }
    if (item.paperInfo?.paper) {
      const paper = await Paper.findById(item.paperInfo.paper).select('name');
      if (paper?.name) itemNames.push(`Paper: ${paper.name}`);
    }
  }

  const orderDate = moment().format('dddd, MMMM Do YYYY');
  const s3Links = orders.map((order) => `https://clickedart.com/bill/${order._id}`);

  await sendOrderThankYouMail(
    `${user.firstName} ${user.lastName}`,
    orderDate,
    itemNames,
    user.email,
    s3Links
  );

  for (const ord of orders) {
    const order = await CustomImageOrder.findById(ord._id).populate('userInfo.user');

    if (!order) {
      console.error(`Order not found for ID: ${ord._id}`);
      continue;
    }

    if (order.printStatus === 'no-print') {
      continue;
    }

    // console.log("Fetched Order:", order);
    await registerCustomDeliveryFromOrder(order);
  }

  res.status(201).json({ success: true, orders });
});



const updatePrintStatus = asyncHandler(async (req, res) => {
  const { orderId, printStatus } = req.body;

  const order = await CustomImageOrder.findOne({ _id: orderId });

  order.printStatus = printStatus;

  await order.save();

  res.status(200).send({ message: "Print Status updated successfully" });
});

const updateReadyToShipStatus = asyncHandler(async (req, res) => {
  const { orderId, status = false } = req.body

  if(!orderId) {
    return res.status(400).send({ message: 'Order Id not found' })
  }
  let readyToShipTimeStamp
  if(status === true) {
    readyToShipTimeStamp = new Date()
  }
 
  await CustomImageOrder.findOneAndUpdate({ _id: orderId }, { readyToShip: status, readyToShipTimeStamp })

  res.status(200).send({ message: 'Ready To Ship Status Updated Successfully' })
})

const getAllCustomOrders = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;

  const orders = await CustomImageOrder.find({})
    .populate('userInfo.user')
    .populate('orderItems.frameInfo.frame')
    .populate('orderItems.paperInfo.paper')
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * pageSize)
    .limit(Number(pageSize));

  if (!orders || orders.length === 0) {
    return res.status(400).json({ message: 'Order not found' });
  }

  const totalDocuments = await CustomImageOrder.countDocuments();
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).json({ orders, pageCount });
});

const getFailedOrders = asyncHandler(async (req, res) => {
  const failedOrders = await CustomImageOrder.find({ orderStatus: 'failed' })
    .populate('userInfo.user')
    .sort({ createdAt: -1 });

  if (!failedOrders || failedOrders.length === 0) {
    return res.status(400).json({ message: 'No failed orders found' });
  }

  res.status(200).json(failedOrders);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { userId } = req.query
 
  const orders = await CustomImageOrder.find({ 'userInfo.user': userId })
    .populate('orderItems.frameInfo.frame')
    .populate('orderItems.paperInfo.paper')
    .sort({ createdAt: -1 });

  if (!orders || orders.length === 0) {
    return res.status(400).json({ message: 'No orders found for this user' });
  }

  res.status(200).json(orders);
});

const getCustomOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.query;

  const order = await CustomImageOrder.findById(orderId)
    .populate('userInfo.user')
    .populate('orderItems.frameInfo.frame')
    .populate('orderItems.paperInfo.paper');

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  res.status(200).json(order);
});

const updateCustomOrderStatus = asyncHandler(async (req, res) => {

  const { orderId, orderStatus, printStatus, isPaid } = req.body;

  const order = await CustomImageOrder.findById(orderId);

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (orderStatus) order.orderStatus = orderStatus;
  if (printStatus) order.printStatus = printStatus;
  if (typeof isPaid === 'boolean') order.isPaid = isPaid;

  const updated = await order.save();

  res.status(200).json(updated);
});


module.exports = {
  createCustomUploadOrder,
  updatePrintStatus,
  updateReadyToShipStatus,
  getAllCustomOrders,
  getFailedOrders,
  getMyOrders,
  getCustomOrderById,
  updateCustomOrderStatus
};
