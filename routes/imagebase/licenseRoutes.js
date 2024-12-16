const express = require('express')
const {
    createLicense,
    updateLicense,
    getAllLicenses,
    getLicenseById,
    deleteLicense 
} = require('../../controller/imagebase/licenseController')
const { isAdmin } = require('../../middleware/authMiddleware')

const router = express.Router()

router.post('/add-license', isAdmin,  createLicense)
router.post('/update-license', isAdmin, updateLicense)
router.get('/get-all-license', getAllLicenses)
router.get('/get-license-by-id', getLicenseById)
router.get('/delete-license', isAdmin, deleteLicense)

module.exports = router