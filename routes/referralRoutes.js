const express = require('express')
const { 
    createReferral,
    getReferral,
    updateReferral,
    deleteReferral,
    getAllReferrals,
    getReferralByPhotographer,
    getActiveReferralByPhotographer,
    isActiveReferral,
    getAllActiveReferrals
 } = require('../controller/referralController.js')
const router = express.Router()

router.post('/create-referral', createReferral)
router.post('/update-referral', updateReferral)
router.delete('/delete-referral', deleteReferral)
router.get('/get-referral-by-photographer', getReferralByPhotographer)
router.get('/get-active-referral-by-photographer', getActiveReferralByPhotographer)
router.get('/get-all-referrals', getAllReferrals)
router.get('/get-active-referral-by-code', isActiveReferral)
router.get('/get-all-active-referrals', getAllActiveReferrals)

module.exports = router