const Order = require('../models/orderModel.js')
const asyncHandler = require('express-async-handler')
const mongoose = require('mongoose')


const userDashboardData = asyncHandler(async (req, res) => {
  const { userId } = req.query;

  let totalSalesAndDownloads = await Order.aggregate([
      {
          $match: {
              'userInfo.user': new mongoose.Types.ObjectId(userId),
              isPaid: true,
          },
      },
      { $unwind: "$orderItems" },
      {
          $group: {
              _id: null,
              sales: { $sum: "$orderItems.finalPrice" },
              downloads: { $sum: 1 },
          },
      },
  ]);

  if (!totalSalesAndDownloads || totalSalesAndDownloads.length === 0) {
      return res.status(400).send({ message: 'No Orders Found' });
  }

  const totalSales = totalSalesAndDownloads[0]?.sales || 0;
  const downloads = totalSalesAndDownloads[0]?.downloads || 0;

  const categories = await Order.aggregate([
      { $match: { 'userInfo.user': new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$orderItems" },
      { $unwind: "$orderItems.imageInfo" },
      {
          $lookup: {
              from: "imagevaults",
              localField: "orderItems.imageInfo.image",
              foreignField: "_id",
              as: "image",
          },
      },
      { $unwind: "$image" },
      { $unwind: "$image.category" },
      {
          $group: {
              _id: "$image.category",
              count: { $sum: 1 },
          },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
          $lookup: {
              from: "categories",
              localField: "_id",
              foreignField: "_id",
              as: "categoryDetails",
          },
      },
      { $unwind: "$categoryDetails" },
  ]);

  res.status(200).send({
      totalPurchase: totalSales,
      downloads,
      frequentlyDownloadedCategories: categories,
  });
});


module.exports = {
    userDashboardData
}