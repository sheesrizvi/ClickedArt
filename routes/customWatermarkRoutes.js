import {
    addCustomWaterMarkImage,
    deleteWatermarkImage,
    getWatermarkImage
} from '../controller/customWatermarkController.js'

const express = require('express')
const router = express.Router()

router.post('/add-custom-watermark', addCustomWaterMarkImage)
router.get('/get-custom-watermark', getWatermarkImage)
router.delete('/delete-custom-watermark', deleteWatermarkImage)

module.exports = router