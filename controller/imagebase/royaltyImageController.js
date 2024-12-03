const mongoose = require('mongoose')
const asyncHandler = require('express-async-handler')
const Royalty = require('../../models/imagebase/royaltyModel.js')

const createRoyalty = asyncHandler(async (req, res) => {
    const { licensingType, royaltyShare, sizePricingModifiers }  = req.body

    const royalty = await Royalty.create({
        licensingType, royaltyShare, sizePricingModifiers
    })

    res.status(200).send({ royalty })
})

const updateRoyalty = asyncHandler(async (req, res) => {
    const { id, licensingType, royaltyShare, sizePricingModifiers }  = req.body

    const royalty = await Royalty.findOne({ _id: id })
    if(!royalty) return res.status(400).send({ message: 'Royalty not found' })
 
    royalty.licensingType = licensingType || royalty.licensingType
    royalty.royaltyShare = royaltyShare || royalty.royaltyShare
    royalty.sizePricingModifiers = sizePricingModifiers || royalty.priceDeviationPercentage

    await royalty.save()

    
    res.status(200).send({ royalty })
})

const getRoyalty = asyncHandler(async (req, res) => {
    const royalty = await Royalty.find({})
    if(!royalty || royalty.length === 0) return res.status(400).send({ message: 'Royalty not found' })
    res.status(400).send({ royalty })
})

const deleteRoyalty = asyncHandler(async (req, res) => {
    const { id } = req.query

    const royalty = await Royalty.findOne({ _id: id })
    if(!royalty) return res.status(400).send({ message: 'Royalty not found' })

    await Royalty.findOneAndDelete({ _id: id })

    res.status(200).send({ message: 'Royalty Deleted successfully' })
})

module.exports = {
    createRoyalty,
    updateRoyalty,
    getRoyalty,
    deleteRoyalty
}