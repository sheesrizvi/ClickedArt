const Invoice = require('../models/invoiceModel')
const asyncHandler = require('express-async-handler')
const Order = require('../models/orderModel')
const RoyaltySettings = require('../models/imagebase/royaltyModel')
const GST = require('../models/gstModel')
const Photographer = require('../models/photographerModel.js')
const ReferralBalance = require('../models/referralBalanceModel.js')
const mongoose = require('mongoose');
const Subscription = require('../models/subscriptionModel.js');
const Monetization = require('../models/monetizationModel.js')

const generateInvoice = async (req, res) => {
  try {
    const { photographerId, startDate, endDate } = req.body;

    const orders = await Order.find({
      'orderItems.imageInfo.photographer': photographerId,
      orderStatus: 'completed',
      isPaid: true,
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    })
      .populate('orderItems.imageInfo.image')
      .populate('orderItems.paperInfo.paper')
      .populate('orderItems.frameInfo.frame');

    const referralBalance = await ReferralBalance.aggregate([
      {
        $match: {
          photographer: new mongoose.Types.ObjectId(photographerId),
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: null,
          price: { $sum: '$amount' },
        },
      },
    ]);
    const totalReferralAmount = referralBalance.length > 0 ? referralBalance[0].price : 0;

    if ((!orders || orders.length === 0) && totalReferralAmount > 0) {
      const invoice = new Invoice({
        photographer: photographerId,
        totalAmountPayable: totalReferralAmount,
        totalReferralAmount,
        paymentStatus: 'pending',
      });
      return res.status(400).send({ invoice });
    }

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        message: 'No completed orders found for the photographer within the given period.',
      });
    }

   // const gstRecord = await GST.findOne({ 'userInfo.user': photographerId });
   const gstRecord = await Monetization.findOne({ photographer: photographerId  });
    const subscription = await Subscription.findOne({
      'userInfo.user': photographerId,
      'userInfo.userType': 'Photographer',
      isActive: true,
    }).populate('planId');

    let royaltyShare;
    if (!subscription || subscription?.planId?.name === 'Basic') {
      royaltyShare = 50;
    } else if (subscription?.planId?.name === 'Intermediate') {
      royaltyShare = 70;
    } else if (subscription?.planId?.name === 'Premium') {
      royaltyShare = 90;
    } else {
      royaltyShare = 50;
    }

    let totalRoyaltyAmount = 0;
    let totalPrintcutAmount = 0;
    let totalAmountPayable = 0;
    const orderDetails = [];

    for (const order of orders) {
      for (const orderItem of order.orderItems) {
        const { image, resolution, price } = orderItem.imageInfo;

        if (!image || !resolution || typeof price !== 'number') {
          throw new Error('Image, resolution, or price missing in order item.');
        }

        const royaltyAmount = (price * royaltyShare) / 100;
        const royaltyWithGST = gstRecord ? royaltyAmount * 1.18 : royaltyAmount;
        totalRoyaltyAmount += royaltyAmount;
        totalAmountPayable += royaltyWithGST;

        const printcutAmount = (orderItem.subTotal * 10) / 100 || 0;
        totalPrintcutAmount += printcutAmount;
        totalAmountPayable += printcutAmount;

        orderDetails.push({
          order: order._id,
          image: image._id,
          resolution,
          originalPrice: price,
          royaltyAmount,
          royaltyWithGST: royaltyWithGST.toFixed(2),
          printcutAmount: printcutAmount.toFixed(2),
        });
      }
    }

    totalAmountPayable += totalReferralAmount;
    const gst = totalAmountPayable - totalRoyaltyAmount;

    const invoice = new Invoice({
      photographer: photographerId,
      orderDetails,
      totalRoyaltyAmount: totalRoyaltyAmount.toFixed(2),
      totalPrintcutAmount: Math.round(totalPrintcutAmount),
      totalReferralAmount: totalReferralAmount,
      gst: gst.toFixed(2),
      totalAmountPayable: totalAmountPayable.toFixed(2),
      paymentStatus: 'pending',
    });

    await invoice.save();

    res.status(201).json({
      message: 'Invoice generated successfully.',
      invoice,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};


const generateSingleOrderInvoice = async (req, res) => {
  try {
    const { orderId } = req.query;

    const order = await Order.findById(orderId)
      .populate('orderItems.imageInfo.image')
      .populate('orderItems.paperInfo.paper')
      .populate('orderItems.frameInfo.frame');

    if (!order || order.orderStatus !== 'completed') {
      return res.status(404).json({ message: 'Completed order not found for the provided ID.' });
    }

    const gstRecord = await GST.findOne({ 'userInfo.user': order.orderItems[0].imageInfo.photographer });

    const subscription = await Subscription.findOne({
      'userInfo.user': order.orderItems[0].imageInfo.photographer,
      'userInfo.userType': 'Photographer',
      isActive: true,
    }).populate('planId');

    let royaltyShare;
    if (!subscription || subscription?.planId?.name === 'Basic') {
      royaltyShare = 50;
    } else if (subscription?.planId?.name === 'Intermediate') {
      royaltyShare = 70;
    } else if (subscription?.planId?.name === 'Premium') {
      royaltyShare = 90;
    } else {
      royaltyShare = 50;
    }

    const { image, resolution, price } = order.orderItems[0].imageInfo;
    if (!image || typeof price !== 'number') {
      throw new Error('Image or price is missing in the order.');
    }

    const adjustedPrice = price;
    const royaltyAmount = (adjustedPrice * royaltyShare) / 100;
    const royaltyWithGST = gstRecord ? royaltyAmount * 1.18 : royaltyAmount;

    let printcutAmount = 0;
    if (order.orderItems[0].subTotal) {
      printcutAmount = (order.orderItems[0].subTotal * 10) / 100;
    }

    const totalAmountPayable = royaltyWithGST + printcutAmount;

    const invoiceDetails = {
      order: order._id,
      photographerId: order.orderItems[0].imageInfo.photographer,
      image: image._id,
      resolution,
      originalPrice: adjustedPrice,
      royaltyAmount,
      royaltyWithGST: royaltyWithGST.toFixed(2),
      printcutAmount: printcutAmount.toFixed(2),
      totalAmountPayable: totalAmountPayable.toFixed(2),
    };

    res.status(200).json({
      message: 'Invoice generated successfully.',
      invoiceDetails,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = { generateSingleOrderInvoice };





const getAllInvoicesByPhotographers = asyncHandler(async (req, res) => {
  const { photographer } = req.query;

  const invoices = await Invoice.find({ photographer })
    .populate('orderDetails.order')
    .populate('orderDetails.image')
    .populate({
      path: 'orderDetails.order',
      populate: [
        { path: 'orderItems.imageInfo.image', model: 'ImageVault' },
        { path: 'orderItems.paperInfo.paper', model: 'Paper' },
        { path: 'orderItems.frameInfo.frame', model: 'Frame' },
      ],
    })
    .sort({ createdAt: -1 });

  if (!invoices || invoices.length === 0) {
    return res.status(400).send({ message: 'Invoice not found' });
  }

  res.status(200).send({ invoices });
});




module.exports = {
    generateInvoice,
    generateSingleOrderInvoice,
    getAllInvoicesByPhotographers
  }