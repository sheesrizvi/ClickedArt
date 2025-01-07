const asyncHandler = require('express-async-handler');
const Referral = require('../models/referralModel.js');
const Photographer = require('../models/photographerModel.js');
const mongoose = require('mongoose')

const createReferral = asyncHandler(async (req, res) => {
    const { code, photographer, commissionRate, discountPercentage, maxUses, expirationDate, maxDiscountAmount, applicableTo } = req.body;

    if (!photographer || !commissionRate || !discountPercentage || !applicableTo) {
        return res.status(400).send({ message: 'Missing required fields' });
    }
    const photographerData = await Photographer.findOne({ _id: photographer })
    if(!photographerData) return res.status(400).send({ message: 'Photographer not exist' })


    const referralExists = await Referral.findOne({ code });
    if (referralExists) {
        return res.status(400).json({ message: 'Referral code already exists' });
    }

    const referral = await Referral.create({
        code,
        photographer,
        commissionRate,
        discountPercentage,
        maxUses,
        expirationDate,
        maxDiscountAmount,
        applicableTo
    });

    res.status(201).send({ referral });
});

const getReferral = asyncHandler(async (req, res) => {
    const { code } = req.query

    const referral = await Referral.findOne({ code }).populate('photographer')
    if (!referral) {
        return res.status(404).json({ message: 'Referral code not found' })
    }

    res.status(200).send({ referral });
})

const updateReferral = asyncHandler(async (req, res) => {
    
    const {code, commissionRate, discountPercentage, maxUses, expirationDate, maxDiscountAmount, status, applicableTo } = req.body

    const referral = await Referral.findOne({ code })
    if (!referral) {
        return res.status(404).json({ message: 'Referral code not found' })
    }

    if (commissionRate) referral.commissionRate = commissionRate
    if (discountPercentage) referral.discountPercentage = discountPercentage
    if (maxUses) referral.maxUses = maxUses
    if (expirationDate) referral.expirationDate = expirationDate
    if (maxDiscountAmount) referral.maxDiscountAmount = maxDiscountAmount
    if (status) referral.status = status
    if (applicableTo) referral.applicableTo = applicableTo

    const updatedReferral = await referral.save()

    res.status(200).send({updatedReferral});
});

const deleteReferral = asyncHandler(async (req, res) => {
    const { code } = req.query;

    const referral = await Referral.findOne({ code })
    if (!referral) {
        return res.status(404).json({ message: 'Referral code not found' });
    }

    await Referral.findOneAndDelete({ code })

    res.status(200).send({ message: 'Referral code removed' })
});

const getAllReferrals = asyncHandler(async (req, res) => {
    const referrals = await Referral.find({}).populate('photographer').populate('users').sort({ createdAt: -1 })
    res.status(200).send(referrals)
})

const getAllActiveReferrals = asyncHandler(async (req, res) => {
    const now = Date.now()
    const referrals = await Referral.find({status: 'active', expirationDate: { $gt: now }}).populate('photographer').populate('users').sort({ createdAt: -1 })
    res.status(200).send(referrals)
})

const getReferralByPhotographer = asyncHandler(async (req, res) => {
    let { photographer } = req.query
    const referrals = await Referral.find({ photographer }).populate('photographer').populate('users').sort({ createdAt: -1 })
    res.status(200).send(referrals)

})

const getActiveReferralByPhotographer = asyncHandler(async (req, res) => {
    const { photographer } = req.query
    const now = new Date()
    const referrals = await Referral.find({ photographer, expirationDate: { $gt: now }, status: 'active' }).populate('photographer').populate('users').sort({ createdAt: -1 })
    if(!referrals || referrals.length > 0) {
        return res.status(400).send({ message: 'No Referral Code found for photographer' })
    }

    res.status(200).send({ referrals })
})

const isActiveReferral = asyncHandler(async (req, res) => {
    const { code } = req.query

    const now = Date.now()
    const referral = await Referral.findOne({ code, status: 'active', expirationDate: { $gt: now } }).populate('photographer')

    if (!referral) {
        return res.status(404).json({ message: 'Referral not found' })
    }
    res.status(200).send({ referral, message: 'Referral is Valid' });
})

module.exports = {
    createReferral,
    getReferral,
    updateReferral,
    deleteReferral,
    getAllReferrals,
    getReferralByPhotographer,
    getActiveReferralByPhotographer,
    isActiveReferral,
    getAllActiveReferrals
};
