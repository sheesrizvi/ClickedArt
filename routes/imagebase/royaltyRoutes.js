const express = require('express')
const { createRoyalty, updateRoyalty, deleteRoyalty, getRoyalty } = require('../../controller/imagebase/royaltyImageController')
const { isAdmin } = require('../../middleware/authMiddleware')
const router = express.Router()


router.post('/create-royalty', isAdmin, createRoyalty)
router.post('/update-royalty', isAdmin, updateRoyalty)
router.delete('/delete-royalty', isAdmin, deleteRoyalty)
router.get('/get-royalty', getRoyalty)

module.exports = router