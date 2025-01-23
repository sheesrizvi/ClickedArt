const asyncHandler = require('express-async-handler')
const Invoice = require('../models/invoiceModel.js')
const Order = require('../models/orderModel.js')
const User = require('../models/userModel.js')
const Photographer = require('../models/photographerModel.js')

const getRevenueOverview = asyncHandler(async (req, res) => {
    
    const totalRevenue = await Order.aggregate([
        { $match: { orderStatus: 'completed', isPaid: true } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]);
  
      const revenueByFiscalYear = await Order.aggregate([
        { $match: { orderStatus: 'completed', isPaid: true } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' } },
            yearlyRevenue: { $sum: '$totalAmount' },
          },
        },
      ]);
  
      const revenueByMonth = await Order.aggregate([
        { $match: { orderStatus: 'completed', isPaid: true } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            monthlyRevenue: { $sum: '$totalAmount' },
          },
        },
      ]);

   
      const revenueByCategory = await Order.aggregate([
        { $match: { orderStatus: 'completed', isPaid: true } },
        {
            $unwind: "$items",
        },
        {
            $group: {
                _id: "$items.category", 
                revenue: {
                    $sum: {
                        $cond: [
                            { $eq: ["$items.category", categoryType === "Prints" ? "Prints" : "Digital Downloads"] }, 
                            categoryType === "Prints" ? "$items.subTotal" : "$items.imageInfo.price",
                            0 
                        ],
                    },
                },
            },
        },
    ]);

      res.status(200).send({ totalRevenue, revenueByFiscalYear, revenueByMonth, revenueByCategory })
})



const getRevenueOverviewByTime = asyncHandler(async (req, res) => {
    const { startDate, endDate, categoryType } = req.query;

    const matchStage = {
        orderStatus: 'completed',
        isPaid: true,
    };

    if (startDate) matchStage.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
        matchStage.createdAt = matchStage.createdAt
            ? { ...matchStage.createdAt, $lte: new Date(endDate) }
            : { $lte: new Date(endDate) };
    }


    const totalRevenue = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$items" },
        {
            $group: {
                _id: null,
                totalRevenue: {
                    $sum: {
                        $cond: [
                            { $eq: ["$items.category", categoryType === "Prints" ? "Prints" : "Digital Downloads"] },
                            categoryType === "Prints" ? "$items.subTotal" : "$items.imageInfo.price",
                            0,
                        ],
                    },
                },
            },
        },
    ]);

 
    const revenueByCategory = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.category",
                revenue: {
                    $sum: {
                        $cond: [
                            { $eq: ["$items.category", categoryType === "Prints" ? "Prints" : "Digital Downloads"] },
                            categoryType === "Prints" ? "$items.subTotal" : "$items.imageInfo.price",
                            0,
                        ],
                    },
                },
            },
        },
    ]);

    res.status(200).send({
        totalRevenue: totalRevenue[0]?.totalRevenue || 0, 
        revenueByCategory,
    });
});



const getSalesMetrics = asyncHandler(async (req, res) => {
    try {
        const { period = 'total', timeframe } = req.query;
        let matchStage = { orderStatus: { $ne: 'cancelled' } };

        if (period !== 'total') {
            let startDate, endDate;
            if (period === 'fy') {
                const year = parseInt(timeframe);
                startDate = new Date(`${year}-04-01T00:00:00.000Z`);
                endDate = new Date(`${year + 1}-04-01T00:00:00.000Z`);
            } else if (period === 'month') {
                startDate = new Date(`${timeframe}-01T00:00:00.000Z`);
                endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));
            } else if (period === 'day') {
                startDate = new Date(`${timeframe}T00:00:00.000Z`);
                endDate = new Date(new Date(startDate).setDate(startDate.getDate() + 1));
            }
            matchStage.createdAt = { $gte: startDate, $lt: endDate };
        }

        const metrics = await Order.aggregate([
            { $match: matchStage },
            { $unwind: '$orderItems' },
            {
                $group: {
                    _id: null,
                    totalDownloads: {
                        $sum: { $cond: [{ $eq: ['$orderItems.subTotal', 0] }, 1, 0] },
                    },
                    totalPrints: {
                        $sum: { $cond: [{ $gt: ['$orderItems.subTotal', 0] }, 1, 0] },
                    },
                    totalOrders: { $sum: 1 },
                    totalDispatched: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', 'dispatched'] }, 1, 0] },
                    },
                    totalDelivered: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', 'completed'] }, 1, 0] },
                    },
                    totalReturned: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', 'returned'] }, 1, 0] },
                    },
                    totalSales: { $sum: '$totalAmount' },
                    topSellingProducts: { $push: { image: '$orderItems.imageInfo.image', quantity: 1 } }
                },
            },
            {
                $project: {
                    _id: 0,
                    totalDownloads: 1,
                    totalPrints: 1,
                    orderCounts: {
                        total: '$totalOrders',
                        dispatched: '$totalDispatched',
                        delivered: '$totalDelivered',
                        returned: '$totalReturned'
                    },
                    averageOrderValue: { $divide: ['$totalSales', '$totalOrders'] },
                    topSellingProducts: 1
                },
            },
            {$unwind: "$topSellingProducts"},
            {$group: {
                _id: "$topSellingProducts.image",
                count: {$sum: "$topSellingProducts.quantity"}
            }},
            {$sort: {count: -1}},
            {$limit: 5},
            {$project: {
                _id: 0,
                image: "$_id",
                count: 1
            }}
        ]);

        res.status(200).json(metrics.length > 0 ? metrics[0] : {message: "No metrics available for this period"});
    } catch (error) {
        console.error("Error fetching sales metrics:", error);
        res.status(500).json({ message: 'Error fetching sales metrics' });
    }
});


const getSalesDataMetrics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query; 

    const matchStage = { orderStatus: 'completed', isPaid: true };

    if (startDate) matchStage.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
        matchStage.createdAt = matchStage.createdAt
            ? { ...matchStage.createdAt, $lte: new Date(endDate) }
            : { $lte: new Date(endDate) };
    }

    const totalDownloads = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$items" },
        {
            $match: {
                "items.category": "Digital Downloads", 
            },
        },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }, 
            },
        },
    ]);


    const totalPrints = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$items" }, 
        {
            $match: {
                "items.category": "Prints", 
            },
        },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }, 
            },
        },
    ]);


    const averageOrderValue = await Order.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$totalAmount" }, 
                orderCount: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                aov: { $divide: ["$totalRevenue", "$orderCount"] }, 
            },
        },
    ]);


    res.status(200).send({
        totalDownloads: totalDownloads[0]?.count || 0,
        totalPrints: totalPrints[0]?.count || 0,
        averageOrderValue: averageOrderValue[0]?.aov || 0,
    });
});


const getCustomerInsights = asyncHandler(async (req, res) => {

})

const getPhotographerEarnings = asyncHandler(async (req, res) => {

})

const getCustomReports = asyncHandler(async (req, res) => {

})

module.exports = {
    getRevenueOverview,
    getRevenueOverviewByTime,
    getSalesMetrics,
    getCustomerInsights,
    getPhotographerEarnings,
    getCustomReports
}