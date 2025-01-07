const Photographer = require('../models/photographerModel.js')
const ImageVault = require('../models/imagebase/imageVaultModel.js')
const Order = require('../models/orderModel.js')
const asyncHandler = require('express-async-handler')
const mongoose = require('mongoose')
const RoyaltySettings = require('../models/imagebase/royaltyModel.js')

const photographerDashboardData = asyncHandler(async (req, res) => {
    const { photographer } = req.query

    const totalUploadingImgCount = await ImageVault.countDocuments({ photographer })
    const pendingImagesCount = await ImageVault.countDocuments({ photographer, isActive: false })

    const orders = await Order.find({
        isPaid: true,
        orderStatus: 'completed',
        'imageInfo.photographer': new mongoose.Types.ObjectId(photographer)
    });


    if (!orders || orders.length === 0) {
        return res.json({
            totalUploadingImgCount,
            pendingImagesCount,
            downloads: 0,
            totalSales: 0,
            totalRoyaltyAmount: 0,
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

    const rank = photographerData.rank;

    let royaltyShare;
    if (rank === 'master' || rank === 'Master') {
        royaltyShare = royaltySettings.rankWiseRoyaltyShare.master;
    } else if (rank === 'ambassador' || rank === 'Ambassador') {
        royaltyShare = royaltySettings.rankWiseRoyaltyShare.ambassador;
    } else if (rank === 'professional' || rank === 'Professional') {
        royaltyShare = royaltySettings.rankWiseRoyaltyShare.professional;
    } else {
        royaltyShare = royaltySettings.royaltyShare || 70; 
    }

    console.log(royaltySettings.rankWiseRoyaltyShare)
    let totalSales = 0;
    let totalRoyaltyAmount = 0;
    let downloads = 0;

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        sales: 0,
        royaltyAmount: 0
    }));


    orders.forEach(order => {
        const price = order.imageInfo.price || 0;
        const royalty = price * (royaltyShare / 100);
        console.log(price, royalty, royaltyShare)
        const orderMonth = new Date(order.createdAt).getMonth();

        totalSales += price;
        totalRoyaltyAmount += royalty;
        downloads += 1;

        monthlyData[orderMonth].sales += price;
        monthlyData[orderMonth].royaltyAmount += royalty;
    })

    const formattedMonthlyData = monthlyData
    .filter(data => data.sales > 0 || data.royaltyAmount > 0)
    .map(data => ({
        month: data.month,
        sales: parseFloat(data.sales.toFixed(2)),
        royaltyAmount: parseFloat(data.royaltyAmount.toFixed(2))
    }));


    const categories = await Order.aggregate([
        { 
          $match: { 
            'imageInfo.photographer': new mongoose.Types.ObjectId(photographer) 
          } 
        },
        { 
          $unwind: "$imageInfo" 
        },
        { 
          $lookup: {
            from: "imagevaults",  
            localField: "imageInfo.image",
            foreignField: "_id",
            as: "image"
          }
        },
        { 
          $unwind: "$image" 
        },
        { 
          $group: {
            _id: "$image.category",
            count: { $sum: 1 }
          }
        },
        { 
          $sort: { count: -1 }
        },
        { 
          $limit: 10 
        },
        { 
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "categoryDetails"
          }
        },
        { 
          $unwind: "$categoryDetails"
        }
      ]);
      

    res.status(200).send({ totalUploadingImgCount, pendingImagesCount, totalSales, totalRoyaltyAmount, monthlyData: formattedMonthlyData, downloads, frequentlyUsedCategories: categories })

})

module.exports = {
    photographerDashboardData
}