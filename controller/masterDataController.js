const Invoice = require('../models/invoiceModel.js')
const Order = require('../models/orderModel.js')
const Photographer = require('../models/photographerModel.js')
const RoyaltySettings = require('../models/imagebase/royaltyModel.js')
const Subscription = require('../models/subscriptionModel.js')
const asyncHandler = require('express-async-handler')
const Monetization = require('../models/monetizationModel.js')
const User = require('../models/userModel.js')
const ImageVault = require('../models/imagebase/imageVaultModel.js')
const Category = require('../models/categoryModel.js')
const Blog = require('../models/socials/blogModel.js')
const Frame = require('../models/imagebase/frameModel.js')
const Paper = require('../models/imagebase/paperModel.js')
const Story = require('../models/storyModel.js')
const Plan = require('../models/planModel.js')
const { sub } = require('date-fns')
const { format } = require('date-fns');

const masterDataController = asyncHandler(async (req, res) => {

        const { startDate, endDate } = req.query;
    
        if (!startDate || !endDate) {
          return res.status(400).json({ message: "Start date and end date are required." });
        }

    
        const start = new Date(startDate); 
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); 

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
           
            let amountPaid = royaltyAmount * 0.9;
            let tds = royaltyAmount * 0.1;
            let totalPaid = amountPaid + tds;
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
            amountPaid = invoice ? amountPaid : 0
            totalPaid = invoice ? totalPaid : 0
            tds = invoice ? tds : 0

            result.push({
              orderDate: format(new Date(order.createdAt), 'do MMM, yyyy'),
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
              TDSPaid: parseFloat(tds?.toFixed(2)),
              TotalPaid: totalPaid,
              pendingBalance: balance,
              bankAccNumber: monetization?.bankAccNumber || "N/A",
              ifsc: monetization?.ifsc || "N/A",
              bankAccountName: monetization?.bankAccountName || "N/A",
              branch: monetization?.branch || "N/A"
            });
    
          }
        }

        res.status(200).json({
          masterData: result,
        });
      
})

const documentCountsForAdmin = asyncHandler(async (req, res) => {

  const totalUsers = await User.countDocuments({ isActive: true })
  const totalPhotos = await ImageVault.countDocuments({ isActive: true })
  const totalPhotographers = await Photographer.countDocuments({ active: true })

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const inactivePhotographersByLogin = await Photographer.countDocuments({
    lastLogin: { $lt: oneWeekAgo },
  })
  const pendingPhotosIn = await ImageVault.find({
    exclusiveLicenseStatus: { $in: [ 'pending' ] }, isActive: false 
  })
  
  const pendingPhotos = await ImageVault.countDocuments({
    exclusiveLicenseStatus: { $in: [ 'pending' ] }, isActive: false
  })


  const totalCategories = await Category.countDocuments({})
  const pendingPhotographers = await Photographer.countDocuments({ photographerStatus: 'pending', active: false })
  const totalblogs = await Blog.countDocuments({ isActive: true })
  const pendingBlogs = await Blog.countDocuments({ isActive: false })
  const totalStories = await Story.countDocuments({})
  const totalFrame = await Frame.countDocuments({})
  const totalPapers = await Paper.countDocuments({})
  const totalOrders = await Order.countDocuments({})
  const pendingOrders = await Order.countDocuments({ printStatus: { $in: ['processing', 'printing', 'packed', 'shipped' ] } })
  const pendingMonetizations = await Monetization.countDocuments({ status: 'pending' })

  const plans = await Plan.find({});

  const activeUsersCount = await Promise.all(plans.map(async (plan) => {
    const count = await Subscription.countDocuments({ planId: plan._id, isActive: true });
    return { planName: plan.name, activeUsers: count }; 
  }));


  res.status(200).send({
    totalUsers,
    totalPhotos,
    totalPhotographers,
    pendingPhotos,
    totalCategories,
    pendingPhotographers,
    totalblogs,
    totalStories,
    totalFrame,
    totalPapers,
    totalOrders,
    pendingOrders,
    pendingMonetizations,
    pendingBlogs,
    planActiveUsersCount: activeUsersCount,
    inactivePhotographersByLogin
  })
})



module.exports = {
    masterDataController,
    documentCountsForAdmin
}