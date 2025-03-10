const express = require('express')

const {
  createPaper,
  getPapers,
  getPaperById,
  updatePaper,
  deletePaper,
  calculatePaperPrices, 
  calculatePaperAndFramePrices,
  getInActivePapers,
  getActivePapers,
  updatePaperStatus
} = require('../../controller/imagebase/paperController')
const router = express.Router()
const { isAdmin } = require('../../middleware/authMiddleware')

router.post('/create-paper', isAdmin, createPaper)
router.post('/update-paper', isAdmin, updatePaper)
router.get('/get-paper', getPapers)
router.get('/get-paper-by-id',getPaperById)
router.get('/calculate-paper-prices', calculatePaperPrices)
router.get('/calculate-paper-frame-prices', calculatePaperAndFramePrices)
router.delete('/delete-paper', isAdmin, deletePaper)

router.get('/get-inactive-papers', getInActivePapers)
router.get('/get-active-papers', getActivePapers)
router.post('/update-paper-status', updatePaperStatus)


module.exports = router