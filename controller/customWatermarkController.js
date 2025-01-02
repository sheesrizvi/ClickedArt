const asyncHandler = require('express-async-handler')
const CustomWatermark = require('../models/imagebase/customWatermarkModel.js')

const addCustomWaterMarkImage = asyncHandler(async (req, res) => {
    const { watermarkImage, photographer } = req.body

    if(!watermarkImage || !photographer) {
        throw new Error('Image not found')
    }

    await CustomWatermark.findOneAndDelete({
        photographer
    })

    const watermark = await CustomWatermark.create({
        watermarkImage, photographer
    })

    res.status(200).send({ watermark })
})


const deleteWatermarkImage = asyncHandler(async (req, res) => {
    const { id } = req.query

    const result = await CustomWatermark.findOneAndDelete({
        _id: id
    })

    if(!result) {
        throw new Error('Watermark Image not found')
    }

    res.status(200).send({ result })
})

const getWatermarkImage = asyncHandler(async( req, res) => {
    const { photographer } = req.query
    const watermarkImage = await CustomWatermark.findOne({ photographer }).populate('photographer')

    if(!watermarkImage) {
        throw new Error('Image not found')
    }

    res.status(200).send({ watermarkImage })
})



module.exports = {
    addCustomWaterMarkImage,
    deleteWatermarkImage,
    getWatermarkImage
}