const asyncHandler = require('express-async-handler');
const Coupon = require('../models/couponModel.js')
const mongoose = require('mongoose')

const createCoupon = asyncHandler(async (req, res) => {
    const { code, discountPercentage, maxDiscountAmount, maxUses, applicableTo, expirationDate } = req.body;

    if (!code || !discountPercentage || !maxDiscountAmount || !applicableTo || !expirationDate) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const codeExist = await Coupon.findOne({ code })
    if(codeExist) {
        throw new Error('Coupon Code Already Exist.')
    }
    
    const coupon = await Coupon.create({
        code,
        discountPercentage,
        maxDiscountAmount,
        expirationDate,
        applicableTo,
        maxUses
    })

    res.status(201).send({ coupon });
})

const getCoupons = asyncHandler(async (req, res) => {
    const { status, applicableTo, expirationDate } = req.query

    const filters = {}

    if (status) filters.status = status;
    if (applicableTo) filters.applicableTo = applicableTo;
    if (expirationDate) filters.expirationDate = { $gt: new Date(expirationDate) };

    const coupons = await Coupon.find(filters);
    res.json(coupons);
});

const getCouponByCode = asyncHandler(async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ message: 'Coupon code is required' })
    }

    const coupon = await Coupon.findOne({ code })
    if (!coupon) return res.status(404).send({ message: 'Coupon not found' })
    res.json({ coupon });
})

const updateCoupon = asyncHandler(async (req, res) => {
    let { id, code , discountPercentage, maxDiscountAmount, maxUses, applicableTo, expirationDate } = req.body;
    
    id = new mongoose.Types.ObjectId(id)
    const coupon = await Coupon.findOne({ _id: id })

    if (!coupon) return res.status(404).json({ message: 'Coupon not found' })
    
    if(code) {
        const codeExist  = await Coupon.findOne({ code, _id: { $ne: id } })
        if(codeExist) {
            throw new Error('Code is already exist')
        }
        coupon.code = code
    }
    if(discountPercentage) coupon.discountPercentage = discountPercentage
    if(maxDiscountAmount) coupon.maxDiscountAmount = maxDiscountAmount
    if(maxUses) coupon.maxUses = maxUses
    if(applicableTo) coupon.applicableTo = applicableTo
    if(expirationDate) coupon.expirationDate = expirationDate
    
    await coupon.save()

    res.send({ coupon })
})

const deleteCoupon = asyncHandler(async (req, res) => {
    const { code } = req.query

    if (!code) {
        return res.status(400).json({ message: 'Coupon code is required' })
    }

    const coupon = await Coupon.findOneAndDelete({ code })
    if (!coupon) return res.status(404).send({ message: 'Coupon not found' })
    res.status(200).send({ message: 'Coupon deleted successfully' })

})

const isActiveCoupon = asyncHandler(async (req, res) => {
    const { code } = req.query

    const now = Date.now()
    const coupon = await Coupon.findOne({ code, status: 'active', expirationDate: { $gt: now }  })
    if(!coupon) {
        return res.status(400).send({ message: 'Coupon not found' })
    }
    
    res.status(200).send({  message: 'Coupon is active', coupon })
})

const getActiveCoupons = asyncHandler(async (req, res) => {
    const now = Date.now()
    const coupons = await Coupon.find({ status: 'active', expirationDate: { $gt: now }  })
    if(!coupons || coupons.length === 0) {
        return res.status(400).send({  message: 'No Coupon Found' })
    }
    res.status(200).send({  coupons })
})


const applyCoupon = asyncHandler(async (req, res) => {
    const { code , userId, type } = req.query
    const now = Date.now()
    
    const coupon = await Coupon.findOne({
        code,
        status: 'active', 
        expirationDate: { $gte: now },
        $expr: {
            $or:[
                { $eq: [ '$maxUses', null ] },
                { $lt: [ '$usageCount', '$maxUses' ] }
            ]
        },
    })

    if(!coupon) {
        return res.status(400).send({message: 'coupon not found or inactive'})
    }

    const userExist = coupon.users.find((userInfo)  => userInfo.user.toString() === userId.toString() )

    if(userExist) {
        return res.status(400).send({message: 'Coupon already used by user or user id not provided'})
    }
    
    if(coupon.applicableTo.toLowerCase() !== type.toLowerCase()) {
        return res.status(400).send({ message: 'Coupon not applicable for this user type' })
    }
    
    res.status(200).send({message: 'Coupon is active and not used by user',  coupon})
})

module.exports = {
    createCoupon,
    getCoupons,
    getCouponByCode,
    updateCoupon,
    deleteCoupon,
    isActiveCoupon,
    getActiveCoupons,
    applyCoupon
};
