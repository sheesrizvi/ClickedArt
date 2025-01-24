const Photographer = require('../models/photographerModel.js')
const ImageVault = require('../models/imagebase/imageVaultModel.js')
const Order = require('../models/orderModel.js')
const asyncHandler = require('express-async-handler')
const mongoose = require('mongoose')
const RoyaltySettings = require('../models/imagebase/royaltyModel.js')
const Invoice = require('../models/invoiceModel.js')
const Subscription = require('../models/subscriptionModel.js')

const photographerDashboardData = asyncHandler(async (req, res) => {
  const { photographer } = req.query;
  
  const totalUploadingImgCount = await ImageVault.countDocuments({ photographer, isActive: true });
  const pendingImagesCount = await ImageVault.countDocuments({ photographer, exclusiveLicenseStatus: { $in: ['pending', 'review'] } , isActive: false   });

  const orders = await Order.find({
      isPaid: true,
      orderStatus: 'completed',
      'orderItems.imageInfo.photographer': new mongoose.Types.ObjectId(photographer),
  });

  if (!orders || orders.length === 0) {
      return res.json({
          totalUploadingImgCount,
          pendingImagesCount,
          downloads: 0,
          totalSales: 0,
          totalRoyaltyAmount: 0,
          totalPrintCutAmount: 0,
          monthlyData: []
      });
  }

  const royaltySettings = await RoyaltySettings.findOne({ licensingType: 'exclusive' });

  if (!royaltySettings) {
      return res.status(404).json({ message: 'Global royalty settings not found.' });
  }

  const photographerData = await Photographer.findOne({ _id: photographer });

  if (!photographerData) {
      return res.status(404).json({ message: "Photographer not found" });
  }

  const rank = photographerData?.rank;

  const subscription = await Subscription.findOne({
      'userInfo.user': photographer,
      'userInfo.userType': 'Photographer',
      isActive: true,
  }).populate('planId');

  let royaltyShare;
  let printRoyaltyShare = royaltySettings?.printRoyaltyShare || 10;

  if (!subscription || subscription?.planId?.name === 'Basic') {
      royaltyShare = royaltySettings?.planWiseRoyaltyShare?.basic || 50;
  } else if (subscription?.planId?.name === 'Intermediate') {
      royaltyShare = royaltySettings?.planWiseRoyaltyShare?.intermediate || 70;
  } else if (subscription?.planId?.name === 'Premium') {
      royaltyShare = royaltySettings?.planWiseRoyaltyShare?.premium || 90;
  } else {
      royaltyShare = 50;
  }

  let totalSales = 0;
  let totalPrintSales = 0;
  let totalRoyaltyAmount = 0;
  let totalPrintCutAmount = 0;
  let downloads = 0;

  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      sales: 0,
      royaltyAmount: 0,
      printCutAmount: 0
  }));

  orders.forEach(order => {
      order.orderItems.forEach(orderItem => {
          const price = orderItem.imageInfo?.price || 0;
          const royalty = price * (royaltyShare / 100);
          const printCut = (orderItem.subTotal * printRoyaltyShare) / 100 || 0;
          const orderMonth = new Date(order.createdAt).getMonth();
          const subTotal = orderItem.subTotal || 0;
          totalPrintSales += subTotal;
          totalSales += price;
          totalRoyaltyAmount += royalty;
          totalPrintCutAmount += printCut;
          downloads += 1;

          monthlyData[orderMonth].sales += price;
          monthlyData[orderMonth].royaltyAmount += royalty;
          monthlyData[orderMonth].printCutAmount += printCut;
      });
  });

  const formattedMonthlyData = monthlyData
      .filter(data => data.sales > 0 || data.royaltyAmount > 0 || data.printCutAmount > 0)
      .map(data => ({
          month: data.month,
          sales: parseFloat(data.sales.toFixed(2)),
          royaltyAmount: parseFloat(data.royaltyAmount.toFixed(2)),
          printCutAmount: parseFloat(data.printCutAmount.toFixed(2)),
      }));

      const categories = await Order.aggregate([
        {
            $match: {
                'orderItems.imageInfo.photographer': new mongoose.Types.ObjectId(photographer)
            }
        },
        { $unwind: "$orderItems" },
        {
            $lookup: {
                from: "imagevaults",
                localField: "orderItems.imageInfo.image",
                foreignField: "_id",
                as: "image"
            }
        },
        { $unwind: "$image" },
        { $unwind: "$image.category" },
        {
            $group: {
                _id: "$image.category",
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "categoryDetails"
            }
        },
        { $unwind: "$categoryDetails" }
    ]);
    

  let totalPaidAmount = await Invoice.aggregate([
      {
          $match: {
              photographer: new mongoose.Types.ObjectId(photographer),
              paymentStatus: 'paid'
          }
      },
      {
          $group: {
              _id: null,
              amount: { $sum: "$totalAmountPayable" }
          }
      }
  ]);

  totalPaidAmount = totalPaidAmount && totalPaidAmount.length > 0 ? totalPaidAmount[0].amount : 0


  const payoutHistory = await Invoice.aggregate([
    { 
      $match: { 
        photographer: new mongoose.Types.ObjectId(photographer), 
        paymentStatus: 'paid'
      }
    },
    {
      $sort: { createdAt: -1 } 
    }
  ]);


  res.status(200).send({
      totalUploadingImgCount,
      pendingImagesCount,
      totalSales: parseFloat(totalSales?.toFixed(2)),
      totalRoyaltyAmount: parseFloat(totalRoyaltyAmount?.toFixed(2)),
      totalPrintCutAmount: parseFloat(totalPrintCutAmount?.toFixed(2)),
      totalPrintSales: parseFloat(totalPrintSales?.toFixed(2)),
      monthlyData: formattedMonthlyData,
      downloads,
      frequentlyUsedCategories: categories,
      totalPaidAmount,
      payoutHistory
  });
});



module.exports = {
    photographerDashboardData
}