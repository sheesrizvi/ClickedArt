const express = require('express')
const {
    createCanvas,
    getCanvases,
    getCanvasById,
    updateCanvas,
    deleteCanvas,
calculateCanvasPrices } = require('../../controller/imagebase/canvasController')
const router = express.Router()
const { isAdmin } = require('../../middleware/authMiddleware')

router.post('/create-canvas', isAdmin, createCanvas)
router.post('/update-canvas', isAdmin, updateCanvas)
router.get('/get-canvas', getCanvases)
router.get('/get-canvas-by-id',getCanvasById)
router.get('/calculate-canvas-prices', calculateCanvasPrices)
router.delete('/delete-canvas', isAdmin, deleteCanvas)


module.exports = router