const express = require('express')
const { 
    createCoupon,
    getCoupons,
    getCouponByCode,
    updateCoupon,
    deleteCoupon,
    isActiveCoupon,
    getActiveCoupons,
    applyCoupon
 } = require('../controller/couponController.js')
const router = express.Router()

router.post('/create-coupon', createCoupon)
router.post('/update-coupon', updateCoupon)
router.get('/get-all-coupon', getCoupons)
router.get('/get-active-coupons', getActiveCoupons)
router.get('/is-active-coupon', isActiveCoupon)
router.get('/get-coupon-by-code', getCouponByCode)
router.delete('/delete-coupon', deleteCoupon)
router.get('/apply-coupon', applyCoupon)

module.exports = router