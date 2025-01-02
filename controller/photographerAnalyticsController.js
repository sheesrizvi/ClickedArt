const Photographer = require('../models/photographerModel.js')
const ImageVault = require('../models/imagebase/imageVaultModel.js')
const Order = require('../models/orderModel.js')
const asyncHandler = require('express-async-handler')
const mongoose = require('mongoose')

const photographerDashboardData = asyncHandler(async (req, res) => {
    const { photographer } = req.query

    const totalUploadingImgCount = await ImageVault.countDocuments({ photographer })
    const pendingImagesCount = await ImageVault.countDocuments({ photographer, isActive: false })

    let totalSales = await Order.aggregate([
        {
            $match: {
                isPaid: true,
                orderStatus: 'completed',
                'imageInfo.photographer': new mongoose.Types.ObjectId(photographer)
            }
        },
        {
            $group: {
                _id: null,
                sales: { $sum: '$imageInfo.price' }
            }
        }
    ])
    totalSales = totalSales.length > 0 ? totalSales[0]?.sales?.toFixed(2) : 0 

   

    res.status(200).send({ totalUploadingImgCount, pendingImagesCount, totalSales })
})

module.exports = {
    photographerDashboardData
}