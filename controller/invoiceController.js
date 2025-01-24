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

   const monetization = await Monetization.findOne({ photographer: photographerId  });
  
   let gstRecord 
    if(monetization) {
      gstRecord =  monetization.businessAccount?.gstNumber 
    } else {
      gstRecord = null
    } 

    const subscription = await Subscription.findOne({
      'userInfo.user': photographerId,
      'userInfo.userType': 'Photographer',
      isActive: true,
    }).populate('planId');
    
    const royaltySettings = await RoyaltySettings.findOne({ licensingType: 'exclusive' })
    

    let royaltyShare;
    let printRoyaltyShare = royaltySettings?.printRoyaltyShare || 10
   

    if (!subscription || subscription?.planId?.name === 'Basic') {
      royaltyShare = royaltySettings?.planWiseRoyaltyShare?.basic || 50
    } else if (subscription?.planId?.name === 'Intermediate') {
      royaltyShare = royaltySettings?.planWiseRoyaltyShare?.intermediate || 70;
    } else if (subscription?.planId?.name === 'Premium') {
      royaltyShare = royaltySettings?.planWiseRoyaltyShare?.premium || 90;
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

        const printcutAmount = (orderItem.subTotal * printRoyaltyShare) / 100 || 0;
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
    const gst = totalAmountPayable - (totalRoyaltyAmount + totalPrintcutAmount + totalReferralAmount);
   
    const tdsPercentage = 10;
    const tdsAmount = (totalRoyaltyAmount * tdsPercentage) / 100; 
    totalAmountPayable  = totalAmountPayable - tdsAmount;


    const invoice = new Invoice({
      photographer: photographerId,
      orderDetails,
      totalRoyaltyAmount: totalRoyaltyAmount.toFixed(2),
      totalPrintcutAmount: Math.round(totalPrintcutAmount),
      totalReferralAmount: totalReferralAmount,
      gst: gst.toFixed(2),
      totalAmountPayable: totalAmountPayable.toFixed(2),
      paymentStatus: 'pending',
      tdsAmount
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

    const photographerId = order.orderItems[0].imageInfo.photographer;

    const monetization = await Monetization.findOne({ photographer: photographerId });
    const gstRecord = monetization?.businessAccount?.gstNumber || null;

    const subscription = await Subscription.findOne({
      'userInfo.user': photographerId,
      'userInfo.userType': 'Photographer',
      isActive: true,
    }).populate('planId');

    const royaltySettings = await RoyaltySettings.findOne({ licensingType: 'exclusive' })
    

    let royaltyShare;
    let printRoyaltyShare = royaltySettings?.printRoyaltyShare || 10
   

    if (!subscription || subscription?.planId?.name === 'Basic') {
      royaltyShare = royaltySettings?.planWiseRoyaltyShare?.basic || 50
    } else if (subscription?.planId?.name === 'Intermediate') {
      royaltyShare = royaltySettings?.planWiseRoyaltyShare?.intermediate || 70;
    } else if (subscription?.planId?.name === 'Premium') {
      royaltyShare = royaltySettings?.planWiseRoyaltyShare?.premium || 90;
    } else {
      royaltyShare = 50;
    }

    let totalRoyaltyAmount = 0;
    let totalPrintcutAmount = 0;
    let totalAmountPayable = 0;
    const orderDetails = [];

    for (const orderItem of order.orderItems) {
      const { image, resolution, price, photographer } = orderItem.imageInfo;

      if (photographer.toString() === photographerId.toString()) {
        if (!image || !resolution || typeof price !== 'number') {
          throw new Error('Image, resolution, or price missing in order item.');
        }

        const royaltyAmount = (price * royaltyShare) / 100;
        const royaltyWithGST = gstRecord ? royaltyAmount * 1.18 : royaltyAmount;
        totalRoyaltyAmount += royaltyAmount;
        totalAmountPayable += royaltyWithGST;

        const printcutAmount = (orderItem.subTotal * printRoyaltyShare) / 100 || 0;
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

    if (orderDetails.length === 0) {
      return res.status(404).json({
        message: 'No valid order items found for the photographer in this order.',
      });
    }

    const gst = totalAmountPayable - (totalRoyaltyAmount + totalPrintcutAmount);


    const tdsPercentage = 10;
    const tdsAmount = (totalRoyaltyAmount * tdsPercentage) / 100; 
    totalAmountPayable  = totalAmountPayable - tdsAmount;


    const invoice = new Invoice({
      photographer: photographerId,
      orderDetails,
      totalRoyaltyAmount: totalRoyaltyAmount.toFixed(2),
      totalPrintcutAmount: Math.round(totalPrintcutAmount),
      gst: gst.toFixed(2),
      totalAmountPayable: totalAmountPayable.toFixed(2),
      paymentStatus: 'pending',
      tdsAmount
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


const updateInvoicePaymentStatus = asyncHandler(async (req, res) => {
  const { invoiceId, status } = req.body



  if(!invoiceId) {
    return res.status(400).send({ message: 'Invoice Id not found' })
  }

  const invoice = await Invoice.findByIdAndUpdate(invoiceId, {
    paymentStatus: status
  }, { new: true })

  if(!invoice) {
    return res.status(400).send({ message: 'Invoice not found' })
  }

  res.status(200).send({ message: 'Invoice Payment status updated successfully' })
})

module.exports = {
    generateInvoice,
    generateSingleOrderInvoice,
    getAllInvoicesByPhotographers,
    updateInvoicePaymentStatus
}

