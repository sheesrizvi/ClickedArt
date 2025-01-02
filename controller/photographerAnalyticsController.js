const Photographer = require('../models/photographerModel.js')
const ImageVault = require('../models/imagebase/imageVaultModel.js')
const asyncHandler = require('express-async-handler')

const photographerDashboardData = asyncHandler(async (req, res) => {
    const { photographer } = req.query

    const totalUploadingImgCount = await ImageVault.countDocuments({ photographer })
    const pendingImagesCount = await ImageVault.countDocuments({ photographer, isActive: false })

    res.status(200).send({ totalUploadingImgCount, pendingImagesCount })
})

module.exports = {
    photographerDashboardData
}