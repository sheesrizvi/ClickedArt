const express = require('express')
const {   
    addLayoutContent,
    getLayoutContent,
    updateLayoutContent,
    deleteLayoutContent, getGoogleReviews } = require('../controller/layoutContentController.js')

const router = express.Router()

router.post('/create-layout-content', addLayoutContent)
router.post('/update-layout-content', updateLayoutContent)
router.get('/get-layout-content', getLayoutContent)
router.get('/get-google-reviews', getGoogleReviews)
router.delete('/delete-layout-content', deleteLayoutContent)

module.exports = router