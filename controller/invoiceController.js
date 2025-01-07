const Invoice = require('../models/invoiceModel')
const asyncHandler = require('express-async-handler')
const Order = require('../models/orderModel')
const RoyaltySettings = require('../models/imagebase/royaltyModel')
const GST = require('../models/gstModel')
const Photographer = require('../models/photographerModel.js')
const ReferralBalance = require('../models/referralBalanceModel.js')
const mongoose = require('mongoose')

const generateInvoice = async (req, res) => {
  const { photographerId, startDate, endDate } = req.body;
  
  const orders = await Order.find({
    'imageInfo.photographer': photographerId,
    orderStatus: 'completed',
    isPaid: true,
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
  })
  .populate('imageInfo.image')
  .populate('paperInfo.paper')
  .populate('frameInfo.frame');
 
  const referralBalance = await ReferralBalance.aggregate([
    {
      $match: {
        photographer: new mongoose.Types.ObjectId(photographerId),
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate)  }
      }
    },
    {
     $group: { _id: null,
        price: { $sum: "$amount" }
      }
    }
  ])
  const totalPrice = referralBalance.length > 0 ? referralBalance[0].price : 0;

  if (!orders || orders.length === 0 ) {
    return res.status(404).json({ message: 'No completed orders found for the photographer within the given period.' });
  }

  const gstRecord = await GST.findOne({ 'userInfo.user': photographerId });
  const royaltySettings = await RoyaltySettings.findOne({ licensingType: 'exclusive' });

  if (!royaltySettings) {
    return res.status(404).json({ message: 'Global royalty settings not found.' });
  }

  const photographerData = await Photographer.findOne({ _id: photographerId });
  const rank = photographerData.rank;
  let royaltyShare;
  console.log("rank", rank);

  if (rank === 'master' || rank === 'Master') {
    royaltyShare = royaltySettings.rankWiseRoyaltyShare.master;
  } else if (rank === 'ambassador' || rank === 'Ambassador') {
    royaltyShare = royaltySettings.rankWiseRoyaltyShare.ambassador;
  } else if (rank === 'professional' || rank === 'Professional') {
    royaltyShare = royaltySettings.rankWiseRoyaltyShare.professional;
  }

  let totalRoyaltyAmount = 0;
  let totalPrintcutAmount = 0;  
  let totalAmountPayable = 0;
  const orderDetails = [];

  for (const order of orders) {
    const { image, resolution } = order.imageInfo;

    if (!image || !resolution) {
      throw new Error('Image or Resolution not exist for order');
    }

    const originalPrice = order.imageInfo.price;
    const royaltyAmount = (originalPrice * royaltyShare) / 100;
    let royaltyWithGST;

    if (gstRecord) {
      royaltyWithGST = royaltyAmount * 1.18;
    } else {
      royaltyWithGST = royaltyAmount;
    }

    totalRoyaltyAmount += royaltyAmount;
    totalAmountPayable += royaltyWithGST;

    let printcutAmount = 0;
    if (order.subTotal) {
      printcutAmount = (order.subTotal * 10) / 100; 
      totalPrintcutAmount += printcutAmount;
      totalAmountPayable += printcutAmount;  
    }

    orderDetails.push({
      order: order._id,
      image: image._id,
      resolution,
      originalPrice,
      royaltyAmount,
      royaltyWithGST: royaltyWithGST.toFixed(2),
      printcutAmount,  
    });
  }

  const gst = (totalAmountPayable - totalRoyaltyAmount).toFixed(2);

 
  const invoice = new Invoice({
    photographer: photographerId,
    orderDetails,
    totalRoyaltyAmount,
    totalPrintcutAmount,  
    gst,
    totalAmountPayable: totalAmountPayable.toFixed(2),
    paymentStatus: 'pending',
  });

  await invoice.save();

  res.status(201).json({
    message: 'Invoice generated successfully.',
    invoice,
  });
};


const generateSingleOrderInvoice = async (req, res) => {
  try {
    const { orderId } = req.query;

    const order = await Order.findById(orderId)
      .populate('imageInfo.image')
      .populate('paperInfo.paper')
      .populate('frameInfo.frame');
      
    if (!order || order.orderStatus !== 'completed') {
      return res.status(404).json({ message: 'Completed order not found for the provided ID.' });
    }

    const gstRecord = await GST.findOne({ 'userInfo.user': order.imageInfo.photographer });
    const royaltySettings = await RoyaltySettings.findOne({ licensingType: 'exclusive' });
    if (!royaltySettings) {
      return res.status(404).json({ message: 'Global royalty settings not found.' });
    }

    const photographerData = await Photographer.findOne({ _id: order.imageInfo.photographer });
    const rank = photographerData.rank;

    let royaltyShare;
    if (rank === 'master' || rank === 'Master') {
      royaltyShare = royaltySettings.rankWiseRoyaltyShare.master;
    } else if (rank === 'ambassador' || rank === 'Ambassador') {
      royaltyShare = royaltySettings.rankWiseRoyaltyShare.ambassador;
    } else if (rank === 'professional'  || rank === 'Professional') {
      royaltyShare = royaltySettings.rankWiseRoyaltyShare.professional;
    } else {
      royaltyShare = royaltySettings.royaltyShare || 70;  
    }

    const { image } = order.imageInfo;
    if(!image) {
      throw new Error('Image not exist');
    }
    
    const adjustedPrice = order.imageInfo.price;
    const royaltyAmount = (adjustedPrice * royaltyShare) / 100;
    let royaltyWithGST;
    if (gstRecord) {
      royaltyWithGST = royaltyAmount * 1.18;
    } else {
      royaltyWithGST = royaltyAmount;
    }

    let printcutAmount = 0;
    if (order.subTotal) {
      printcutAmount = (order.subTotal * 10) / 100; 
    }

    const totalAmountPayable = royaltyWithGST + printcutAmount;

    const invoiceDetails = {
      order: order._id,
      photographerId: order.imageInfo.photographer,
      image: image._id,
      resolution: order.imageInfo.resolution,
      originalPrice: adjustedPrice,
      royaltyAmount,
      royaltyWithGST: royaltyWithGST.toFixed(2),
      printcutAmount,  
      totalAmountPayable: totalAmountPayable.toFixed(2),  
    };

    res.status(200).json({
      message: 'Invoice generated successfully.',
      invoiceDetails,
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};





const getAllInvoicesByPhotographers = asyncHandler(async (req, res) => {
    const { photographer } = req.query
  
    const invoices = await Invoice.find({ photographer}).populate('orderDetails.order').populate('orderDetails.image').sort({ createdAt: -1 })
    
    if(!invoices || invoices.length === 0) {
        return res.status(400).send({ message: 'Invoice not found' })
    }
    res.status(200).send({ invoices })
})


module.exports = {
    generateInvoice,
    generateSingleOrderInvoice,
    getAllInvoicesByPhotographers
  }