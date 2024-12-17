const asyncHandler = require('express-async-handler');
const Coupon = require('../models/Coupon');

const createCoupon = asyncHandler(async (req, res) => {
    const { code, discountPercentage, maxDiscountAmount, maxUses, applicableTo, expirationDate } = req.body;

    if (!code || !discountPercentage || !maxDiscountAmount || !applicableTo || !expirationDate) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    
    const coupon = await Coupon.create({
        code,
        discountPercentage,
        maxDiscountAmount,
        expirationDate,
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
    const { code, discountPercentage, maxDiscountAmount, maxUses, applicableTo, expirationDate } = req.query;

    const coupon = await Coupon.findOne({ code })

    if (!coupon) return res.status(404).json({ message: 'Coupon not found' })

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

    const coupon = await Coupon.findOne({ code })
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
    const coupons = await Coupon.find({ code, status: 'active', expirationDate: { $gt: now }  })
    if(!coupons || coupons.length === 0) {
        return res.status(400).send({  message: 'No Coupon Found' })
    }
    res.status(200).send({  coupons })
})

module.exports = {
    createCoupon,
    getCoupons,
    getCouponByCode,
    updateCoupon,
    deleteCoupon,
    isActiveCoupon,
    getActiveCoupons
};
