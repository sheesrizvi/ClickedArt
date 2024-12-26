const Invoice = require('../models/invoiceModel')
const asyncHandler = require('express-async-handler')
const Order = require('../models/orderModel')
const RoyaltySettings = require('../models/imagebase/royaltyModel')
const GST = require('../models/gstModel')
const mongoose = require('mongoose')
const Photographer = require('../models/photographerModel.js')

const generateInvoice = async (req, res) => {
  const { photographerId, startDate, endDate } = req.body;

  const orders = await Order.find({
    'imageInfo.photographer': photographerId,
    orderStatus: 'completed',
    isPaid: true,
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
  }).populate('imageInfo.image');
 
  if (!orders.length) {
    return res.status(404).json({ message: 'No completed orders found for the photographer within the given period.' });
  }
  const gstRecord = await GST.findOne({ 'userInfo.user': photographerId })
  const royaltySettings = await RoyaltySettings.findOne({ licensingType: 'exclusive' });
  if (!royaltySettings) {
    return res.status(404).json({ message: 'Global royalty settings not found.' });
  }

  const photographerData = await Photographer.findOne({ _id: photographerId })
  const rank = photographerData.rank
  let royaltyShare
  if(rank === 'master') {
    royaltyShare = royaltySettings.rankWiseRoyaltyShare.master
  } else if (rank === 'ambassador') {
    royaltyShare = royaltySettings.rankWiseRoyaltyShare.ambassador
  } else if (rank === 'professional') {
    royaltyShare = royaltySettings.rankWiseRoyaltyShare.professional
  }

  let totalRoyaltyAmount = 0;
  let totalAmountPayable = 0;
  const orderDetails = [];

 
  for (const order of orders) {
    
    const { image, resolution } = order.imageInfo
   
   
    const originalPrice = order.imageInfo.price

    const royaltyAmount = (originalPrice * royaltyShare) / 100;
    let royaltyWithGST
    if(gstRecord) {
      royaltyWithGST = royaltyAmount * 1.18;
    } else {
      royaltyWithGST = royaltyAmount
    }

    totalRoyaltyAmount += royaltyAmount;
    totalAmountPayable += royaltyWithGST;

    orderDetails.push({
      order: order,
      image: image._id,
      resolution,
      originalPrice,
      royaltyAmount,
      royaltyWithGST,
    });
  }

  const gst = (totalAmountPayable - totalRoyaltyAmount).toFixed(2);


  const invoice = new Invoice({
    photographer: photographerId,
    orderDetails,
    startDate,
    endDate,
    totalRoyaltyAmount,
    gst,
    totalAmountPayable,
    paymentStatus: 'pending',
  });

  await invoice.save();

  res.status(201).json({
    message: 'Invoice generated successfully.',
    invoice
  });

};


const generateSingleOrderInvoice = async (req, res) => {
  try {
    const { orderId } = req.query;

    const order = await Order.findById(orderId).populate('imageInfo.image');
    if (!order || order.orderStatus !== 'completed') {
      return res.status(404).json({ message: 'Completed order not found for the provided ID.' });
    }
   
    const gstRecord = await GST.findOne({ 'userInfo.user': order.imageInfo.photographer})
    const royaltySettings = await RoyaltySettings.findOne({ licensingType: 'exclusive' });
    if (!royaltySettings) {
      return res.status(404).json({ message: 'Global royalty settings not found.' });
    }

    const royaltyShare = royaltySettings.royaltyShare || 70;

   
    const { image } = order.imageInfo;
    const adjustedPrice = order.imageInfo.price; 


    const royaltyAmount = (adjustedPrice * royaltyShare) / 100;
    let royaltyWithGST
    if(gstRecord) {
      royaltyWithGST = royaltyAmount * 1.18;
    } else {
      royaltyWithGST = royaltyAmount
    }


    const invoiceDetails = {
      order: order,
      photographerId: order.imageInfo.photographer,
      image: image._id,
      resolution: order.imageInfo.resolution,
      originalPrice: adjustedPrice, 
      royaltyAmount,
      royaltyWithGST,
      totalAmountPayable: royaltyWithGST,
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