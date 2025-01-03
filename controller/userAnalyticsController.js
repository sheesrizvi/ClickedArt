const Order = require('../models/orderModel.js')
const asyncHandler = require('express-async-handler')
const mongoose = require('mongoose')


const userDashboardData = asyncHandler(async (req, res) => {
    const { userId } = req.query

    let totalSales = await Order.aggregate([
        {
            $match: {
                'userInfo.user': new mongoose.Types.ObjectId(userId),
                isPaid: true
            }
        },
        {
            $group: {
                _id: null,
                sales: { $sum: "$totalAmount" },
                downloads: { $sum: 1 }
            }
        }
    ])
    
    if(!totalSales || totalSales.length === 0) {
        return res.status(400).send({ message: 'No Orders Found' })
    }
    downloads = totalSales.length > 0 ? totalSales[0]?.downloads : 0
    
    totalSales = totalSales.length > 0 ? totalSales[0]?.sales : 0


    
    const categories = await Order.aggregate([
        { 
          $match: { 
            'userInfo.user': new mongoose.Types.ObjectId(userId) 
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
      
        
    

    res.status(200).send({ totalPurchase: totalSales, downloads, frequentlyDownloadedCategories: categories})
    
})

module.exports = {
    userDashboardData
}