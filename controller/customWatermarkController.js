const asyncHandler = require('express-async-handler')
const CustomWatermark = require('../models/imagebase/customWatermarkModel.js')

const addCustomWaterMarkImage = asyncHandler(async (req, res) => {
    const { watermarkImage, photographer } = req.body

    if(!watermarkImage || !photographer) {
        throw new Error('Image not found')
    }

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
    const image = await CustomWatermark.findOne({})

    if(!image) {
        throw new Error('Image not found')
    }

    res.status(200).send({ image })
})
module.exports = {
    addCustomWaterMarkImage,
    deleteWatermarkImage,
    getWatermarkImage
}