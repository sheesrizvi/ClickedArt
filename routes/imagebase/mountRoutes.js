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
    getAllActiveMount,
    getAllowedOptions,
    validateSize,
    getConfiguration
} = require('../../controller/imagebase/mountController')
const { isAdmin } = require('../../middleware/authMiddleware')
const router = express.Router()


router.post('/create-mount', isAdmin, createMount)
router.post('/update-mount', isAdmin, updateMount )
router.get('/get-mount-by-id', getMountById)
router.get('/get-mount', getMount )
router.get('/get-mounts', getMount )
router.get('/get-allowed-options', getAllowedOptions)
router.post('/validate-size', validateSize)
router.get('/get-configuration', getConfiguration)
router.get('/calculate-mount-prices', calculateMountPrices)
router.delete('/delete-mount', isAdmin, deleteMount)
router.get('/get-inactive-mount', getAllInactiveMount)
router.get('/get-active-mount', getAllActiveMount)
router.post('/update-mount-status', isAdmin, updateMountStatus)

module.exports = router