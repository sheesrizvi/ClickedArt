const asyncHandler = require('express-async-handler')
const Invoice = require('../models/invoiceModel.js')
const Order = require('../models/orderModel.js')
const User = require('../models/userModel.js')
const Photographer = require('../models/photographerModel.js')
const Subscription = require('../models/subscriptionModel.js')

const getRevenueOverview = asyncHandler(async (req, res) => {
    const { categoryType = 'Prints' } = req.query;

    const totalRevenue = await Order.aggregate([
        { $match: { orderStatus: 'completed',  isPaid: true } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
    ]);

    const revenueByFiscalYear = await Order.aggregate([
        { 
            $match: { 
                orderStatus: 'completed', 
                isPaid: true,
            } 
        },
        {
            $addFields: {
                fiscalYear: {
                    $cond: [
                        { $lt: [{ $month: '$createdAt' }, 4] }, 
                        { $subtract: [{ $year: '$createdAt' }, 1] }, 
                        { $year: '$createdAt' } 
                    ]
                }
            }
        },
        {
            $group: {
                _id: { fiscalYear: '$fiscalYear' },
                fiscalYearRevenue: { $sum: '$totalAmount' }
            }
        },
        {
            $sort: { '_id.fiscalYear': 1 } 
        }
    ]);
    // const revenueByFiscalYear = await Order.aggregate([ 
    //     { $match: { orderStatus: 'completed', isPaid: true } },
    //     {
    //         $group: {
    //             _id: { year: { $year: '$createdAt' } },
    //             yearlyRevenue: { $sum: '$totalAmount' },
    //         },
    //     },
    // ]);

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
        { $unwind: "$orderItems" },
        {
            $match: {
                $or: [
                    { "orderItems.subTotal": { $exists: true, $ne: null } },
                    { "orderItems.imageInfo.price": { $exists: true, $ne: null } }
                ],
            },
        },
        {
            $group: {
                _id: null,
                revenue: {
                    $sum: {
                        $cond: [
                            { $eq: [categoryType, "Prints"] },
                            { $ifNull: ["$orderItems.subTotal", 0] },
                            { $ifNull: ["$orderItems.imageInfo.price", 0] }
                        ],
                    },
                },
            },
        },
    ]);

    const totalRevenueAmount = totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0;
    const revenueByFiscalYearData = revenueByFiscalYear.map(item => ({
        year: item._id.fiscalYear,
        yearlyRevenue: item.fiscalYearRevenue,
    }));
    
    const revenueByMonthData = revenueByMonth.map(item => ({
        year: item._id.year,
        month: item._id.month,
        monthlyRevenue: item.monthlyRevenue,
    }));
    const revenueByCategoryAmount = revenueByCategory.length > 0 ? revenueByCategory[0].revenue : 0;

    let basicPlanRevenue = 0
    let intermediatePlanRevenue = 0
    let advancedPlanRevenue = 0

    const subscriptions = await Subscription.find({ }).populate('planId')

    for(let subs of subscriptions) {
        if(subs.planId.name === 'Basic') {
          const baseAmount = (subs?.price * 100)/118
          basicPlanRevenue += baseAmount
        } else if(subs.planId.name === 'Intermediate') {
          const baseAmount = (subs?.price * 100)/118
          intermediatePlanRevenue += baseAmount
        } else if (subs.planId.name === 'Premium') {
          const baseAmount = (subs?.price * 100)/118
          advancedPlanRevenue += baseAmount
        }
    }

    res.status(200).send({
        totalRevenue: totalRevenueAmount,
        revenueByFiscalYear: revenueByFiscalYearData,
        revenueByMonth: revenueByMonthData,
        revenueByCategory: revenueByCategoryAmount,
        basicPlanRevenue,
        intermediatePlanRevenue,
        advancedPlanRevenue
    });

});


const revenueByCategory = asyncHandler(async (req, res) => {
    const { categoryType = "Prints", startDate, endDate } = req.query;

    if (!startDate || !endDate || isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
        return res.status(400).send({ message: "Invalid startDate or endDate provided" });
    }

    const startOfDay = new Date(new Date(startDate).setHours(0, 0, 0, 0)); 
    const endOfDay = new Date(new Date(endDate).setHours(23, 59, 59, 999)); 

    const revenueByCategory = await Order.aggregate([
        {
            $match: {
                orderStatus: 'completed',
                isPaid: true,
                createdAt: { 
                    $gte: startOfDay,
                    $lte: endOfDay,
                },
            },
        },
        { $unwind: "$orderItems" },
        {
            $match: {
                $or: [
                    { "orderItems.subTotal": { $exists: true, $ne: null } }, 
                    { "orderItems.imageInfo.price": { $exists: true, $ne: null } }, 
                ],
            },
        },
        {
            $group: {
                _id: null,
                revenue: {
                    $sum: {
                        $cond: [
                            { $eq: [categoryType, "Prints"] },
                            { $ifNull: ["$orderItems.subTotal", 0] },
                            { $ifNull: ["$orderItems.imageInfo.price", 0] },
                        ],
                    },
                },
            },
        },
    ]);


    let totalRevenue = await Order.aggregate([
        { $match: { orderStatus: 'completed',
            isPaid: true, createdAt: { 
            $gte: startOfDay,
            $lte: endOfDay,
        }, } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]);

    totalRevenue = totalRevenue && totalRevenue.length > 0 ? totalRevenue[0]?.totalRevenue : 0

    res.status(200).send({
        categoryType,
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        revenue: revenueByCategory[0]?.revenue || 0,
        totalRevenue
    });
});



const getSalesDataMetrics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const startOfDay = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : undefined;
    const endOfDay = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : undefined;

    const matchStage = { orderStatus: 'completed', isPaid: true };

    if (startOfDay) matchStage.createdAt = { $gte: startOfDay };
    if (endOfDay) {
        matchStage.createdAt = matchStage.createdAt
            ? { ...matchStage.createdAt, $lte: endOfDay }
            : { $lte: endOfDay };
    }

    const totalDownloads = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$orderItems" }, 
        {
            $match: {
                "orderItems.imageInfo.price": { $exists: true }, 
            },
        },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }, 
            },
        },
    ]);

 const matchStageForPrint = { orderStatus: 'completed', isPaid: true  };
    const totalPrints = await Order.aggregate([
        { $match: matchStageForPrint },
        { $unwind: "$orderItems" }, 
        {
            $match: {
                "orderItems.subTotal": { $exists: true, $ne: 0 }, 
            },
        },
        {
            $group: {
                _id: null,
                count: { $sum: 1 }, 
            },
        },
    ]);
    


    const analytics = await Order.aggregate([
        {
          $match: { 
            printStatus: { $ne: 'no-print' } 
          }
        },
        {
          $group: {
            _id: '$printStatus',
            count: { $sum: 1 },
          },
        },
      ]);
      
      const result = {
        processing: 0,
        printing: 0,
        packed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        returned: 0,
      };
  
      analytics.forEach((item) => {
        result[item._id] = item.count; 
      });
  

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
        printData: result
    });
});


const getCustomerInsights = asyncHandler(async (req, res) => {
    const activeBuyers = await Order.aggregate([
        { $match: { orderStatus: 'completed', isPaid: true } },  
        { $group: { _id: "$userInfo.user" } },  
        { $count: "activeBuyers" },  
    ]);

    const activePhotographers = await Order.aggregate([
        { $match: { orderStatus: 'completed', isPaid: true  } },  
        { $unwind: "$orderItems" }, 
        { $group: { _id: "$orderItems.imageInfo.photographer" } }, 
        { $count: "activePhotographers" }, 
    ]);

    const repeatPurchaseRateData = await Order.aggregate([
        { $match: { orderStatus: 'completed', isPaid: true } },
        { $group: { _id: "$userInfo.user", orderCount: { $sum: 1 } } },  
        { $match: { orderCount: { $gt: 1 } } },  
    ]);

    const totalBuyersCount = await Order.aggregate([
        { $match: { orderStatus: 'completed', isPaid: true } }, 
        { $group: { _id: "$userInfo.user" } },  
        { $count: "totalBuyers" }  
    ]);

    const repeatPurchaseRate = totalBuyersCount[0]?.totalBuyers
        ? ((repeatPurchaseRateData.length || 0) / totalBuyersCount[0]?.totalBuyers) * 100
        : 0;
    const clvData = await Order.aggregate([
        { $match: { orderStatus: 'completed', isPaid: true } },  
        { $group: { _id: "$userInfo.user", totalSpent: { $sum: "$totalAmount" } } },  
        { $group: { _id: null, avgCLV: { $avg: "$totalSpent" } } },  
    ]);

    const customerLifetimeValue = clvData[0]?.avgCLV || 0;

    res.status(200).send({
        activeBuyers: activeBuyers[0]?.activeBuyers || 0,  
        activePhotographers: activePhotographers[0]?.activePhotographers || 0,  
        repeatPurchaseRate: repeatPurchaseRate.toFixed(2),  
        customerLifetimeValue: customerLifetimeValue.toFixed(2), 
    });
});

const getPhotographerEarnings = asyncHandler(async (req, res) => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    const endOfDay = new Date().setHours(23, 59, 59, 999);

    const calculatePayouts = async (paymentStatus, startDate, endDate = null) => {
        const matchStage = { paymentStatus };
        if (startDate) matchStage.createdAt = { $gte: startDate };
        if (endDate) matchStage.createdAt.$lte = endDate;

        const result = await Invoice.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$totalAmountPayable" },
                },
            },
        ]);
        return result[0]?.totalAmount || 0;
    };

    const payoutsThisYear = await calculatePayouts('paid', startOfYear);
    const payoutsThisMonth = await calculatePayouts('paid', startOfMonth);
    const payoutsToday = await calculatePayouts('paid', startOfDay, endOfDay);

    const pendingThisYear = await calculatePayouts('pending', startOfYear);
    const pendingThisMonth = await calculatePayouts('pending', startOfMonth);
    const pendingToday = await calculatePayouts('pending', startOfDay, endOfDay);

    res.status(200).send({
        payouts: {
            thisYear: payoutsThisYear,
            thisMonth: payoutsThisMonth,
            today: payoutsToday,
        },
        pending: {
            thisYear: pendingThisYear,
            thisMonth: pendingThisMonth,
            today: pendingToday,
        },
    });

});

const getSubsAnalytics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate || isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
        return res.status(400).send({ message: "Invalid startDate or endDate provided" });
    }

    const startOfDay = new Date(new Date(startDate).setHours(0, 0, 0, 0)); 
    const endOfDay = new Date(new Date(endDate).setHours(23, 59, 59, 999)); 

    let basicPlanRevenue = 0
    let intermediatePlanRevenue = 0
    let advancedPlanRevenue = 0

    const subscriptions = await Subscription.find({ createdAt : { $gte: startOfDay, $lte: endOfDay } }).populate('planId')

    for(let subs of subscriptions) {
        if(subs.planId.name === 'Basic') {
          const baseAmount = (subs?.price * 100)/118
          basicPlanRevenue += baseAmount
        } else if(subs.planId.name === 'Intermediate') {
          const baseAmount = (subs?.price * 100)/118
          intermediatePlanRevenue += baseAmount
        } else if (subs.planId.name === 'Premium') {
          const baseAmount = (subs?.price * 100)/118
          advancedPlanRevenue += baseAmount
        }
    }

    res.status(200).send({ 
        basicPlanRevenue,
        intermediatePlanRevenue,
        advancedPlanRevenue
     })
})



module.exports = {
    getRevenueOverview,
    getCustomerInsights,
    getPhotographerEarnings,
    revenueByCategory,
    getSalesDataMetrics,
    getSubsAnalytics
}