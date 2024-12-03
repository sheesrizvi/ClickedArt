const express = require('express')
const {
    createFrame,
    getFrames,
    getFrameById,
    updateFrame,
    deleteFrame, 
    calculateFramePrices} = require('../../controller/imagebase/frameController')
const { isAdmin } = require('../../middleware/authMiddleware')
const router = express.Router()


router.post('/create-frame', isAdmin, createFrame)
router.post('/update-frame', isAdmin, updateFrame )
router.get('/get-frame-by-id', getFrameById)
router.get('/get-frames', getFrames )
router.get('/calculate-frames-prices', calculateFramePrices)
router.delete('/delete-frame', isAdmin, deleteFrame)


module.exports = router