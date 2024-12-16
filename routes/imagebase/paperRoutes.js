const express = require('express')

const {
  createPaper,
  getPapers,
  getPaperById,
  updatePaper,
  deletePaper,
  calculatePaperPrices } = require('../../controller/imagebase/paperController')
const router = express.Router()
const { isAdmin } = require('../../middleware/authMiddleware')

router.post('/create-paper', isAdmin, createPaper)
router.post('/update-paper', isAdmin, updatePaper)
router.get('/get-paper', getPapers)
router.get('/get-paper-by-id',getPaperById)
router.get('/calculate-paper-prices', calculatePaperPrices)
router.delete('/delete-paper', isAdmin, deletePaper)


module.exports = router