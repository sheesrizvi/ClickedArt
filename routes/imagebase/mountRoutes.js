const express = require('express')
const {
    createMount,
    getMount,
    getMountById,
    updateMount,
    deleteMount, 
    calculateMountPrices,
    getAllInactiveMount,
    updateMountStatus,
    getAllActiveMount
} = require('../../controller/imagebase/mountController')
const { isAdmin } = require('../../middleware/authMiddleware')
const router = express.Router()


router.post('/create-mount', createMount)
router.post('/update-mount', isAdmin, updateMount )
router.get('/get-mount-by-id', getMountById)
router.get('/get-mount', getMount )
router.get('/calculate-mount-prices', calculateMountPrices)
router.delete('/delete-mount', isAdmin, deleteMount)
router.get('/get-inactive-mount', getAllInactiveMount)
router.get('/get-active-mount', getAllActiveMount)
router.post('/update-mount-status', updateMountStatus)

module.exports = router