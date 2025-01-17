const mongoose = require('mongoose')
const asyncHandler = require('express-async-handler')
const Royalty = require('../../models/imagebase/royaltyModel.js')

const createRoyalty = asyncHandler(async (req, res) => {
    const { licensingType, planWiseRoyaltyShare, sizePricingModifiers, watermarkImage, printRoyaltyShare }  = req.body

    if(!planWiseRoyaltyShare || !sizePricingModifiers || !watermarkImage) {
        return res.status(400).send({ message: 'All Fields are required' })
    }
    await Royalty.deleteMany({})

    const royalty = await Royalty.create({
        licensingType, planWiseRoyaltyShare, sizePricingModifiers, watermarkImage, printRoyaltyShare
    })

    res.status(200).send({ royalty })
})

const updateRoyalty = asyncHandler(async (req, res) => {
    const { id, licensingType, planWiseRoyaltyShare, sizePricingModifiers, watermarkImage, printRoyaltyShare }  = req.body

    const royalty = await Royalty.findOne({ _id: id })
    if(!royalty) return res.status(400).send({ message: 'Royalty not found' })
 
    royalty.licensingType = licensingType || royalty.licensingType
    royalty.planWiseRoyaltyShare = planWiseRoyaltyShare || royalty.planWiseRoyaltyShare
    royalty.sizePricingModifiers = sizePricingModifiers || royalty.priceDeviationPercentage
    royalty.watermarkImage = watermarkImage || royalty.watermarkImage
    royalty.printRoyaltyShare  = printRoyaltyShare || royalty.printRoyaltyShare

    await royalty.save()

    
    res.status(200).send({ royalty })
})

const getRoyalty = asyncHandler(async (req, res) => {
    const royalty = await Royalty.find({})
    if(!royalty || royalty.length === 0) return res.status(400).send({ message: 'Royalty not found' })
    res.status(200).send({ royalty })
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