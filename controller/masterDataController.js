const Invoice = require('../models/invoiceModel.js')
const Order = require('../models/orderModel.js')
const Photographer = require('../models/photographerModel.js')
const RoyaltySettings = require('../models/imagebase/royaltyModel.js')
const Subscription = require('../models/subscriptionModel.js')
const asyncHandler = require('express-async-handler')
const Monetization = require('../models/monetizationModel.js')

const masterDataController = asyncHandler(async (req, res) => {

        const { startDate, endDate } = req.query;
    
        if (!startDate || !endDate) {
          return res.status(400).json({ message: "Start date and end date are required." });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
    
        const royaltySettings = await RoyaltySettings.findOne({ licensingType: 'exclusive' });
    
        let printRoyaltyShare = royaltySettings?.printRoyaltyShare || 10;
    

        const orders = await Order.find({
          createdAt: { $gte: start, $lte: end },
        });
    
 
        const result = [];
    

        for (const order of orders) {
          for (const orderItem of order.orderItems) {
         
            const { image, photographer, price } = orderItem.imageInfo;
            const printPrice = orderItem.subTotal;
    
            if (!photographer) {
              continue;
            }
    

            const photographerDetails = await Photographer.findById(photographer);
    
            const subscription = await Subscription.findOne({ 'userInfo.user': photographerDetails._id }).populate('planId');
          

            let royaltyShare;
            if (!subscription || subscription?.planId?.name === 'Basic') {
              royaltyShare = royaltySettings?.planWiseRoyaltyShare?.basic || 50;
            } else if (subscription?.planId?.name === 'Intermediate') {
              royaltyShare = royaltySettings?.planWiseRoyaltyShare?.intermediate || 70;
            } else if (subscription?.planId?.name === 'Premium') {
              royaltyShare = royaltySettings?.planWiseRoyaltyShare?.premium || 90;
            } else {
              royaltyShare = 50;
            }
    
            let royaltyAmount 
            if(orderItem?.imageInfo?.price > 0) {
                royaltyAmount = (price * royaltyShare) / 100;
            } else {
                royaltyAmount =  (printPrice * printRoyaltyShare) / 100 || 0;
            }
           
            const amountPaid = royaltyAmount * 0.9;
            const tds = royaltyAmount * 0.1;
            const totalPaid = amountPaid + tds;
            const baseAmount =  price > 0 ? price : printPrice > 0 ? printPrice : 0
            const TotalGST = ( orderItem?.sgst + orderItem?.cgst) || 0
            const TotalAmount = baseAmount + TotalGST

            const photographerId = photographerDetails._id
            const photographerName = `${photographerDetails.firstName} ${photographerDetails.lastName}`
            const photographerEmail = photographerDetails.email
            const membershipPlan = subscription?.planId?.name || 'Basic' 
            
            const monetization = await Monetization.findOne({ photographer: photographerDetails._id })

            const photographerPAN = monetization?.panNumber || " "
            const photographerGST = monetization?.businessAccount?.gstNumber || " "
            
            const invoice = await Invoice.findOne({
              paymentStatus: 'paid',
              'orderDetails.order': order._id, 
            });

            const balance = invoice ? 0 : totalPaid

            result.push({
              orderDate: order.createdAt,
              orderType: price > 0 ? "Digital" : printPrice > 0 ? "Print" : "Unknown",
              orderNumber: order._id,
              invoiceNumber: order.invoiceId,
              userState: order.shippingAddress?.state || "N/A",
              baseAmount,
              sgst: orderItem.sgst || 0,
              cgst: orderItem.cgst || 0,
              totalGST: TotalGST,
              totalAmount: TotalAmount,
              photographerId,
              membershipPlan,
              photographerPAN,
              GST: photographerGST,
              photographerName,
              photographerEmail,
              TotalRoyalty: royaltyAmount,
              AmountPaid: amountPaid,
              TDSPaid: tds,
              TotalPaid: totalPaid,
              balance
            });
    
          }
        }
    
        res.status(200).json({
          masterData: result
        });
      
})

module.exports = {
    masterDataController
}