const express = require('express')
const { 
        addImageInVault,
        updateImageInVault,
        getImageFromVault,
        getAllImagesFromVault,
        deleteImagesFromVault,
        getAllImagesByPhotographer,
        getImagesByCategory,
        getImagesByCategoryType,
        approveImage,
        getAllPendingImagesForAdmin,
        toggleFeaturedArtwork,
        getFeaturedArtwork
     } = require('../../controller/imagebase/imageVaultController')
const { IsAdminOrPhotographer, isAdmin } = require('../../middleware/authMiddleware')

const router = express.Router()


router.post('/add-image-in-vault', IsAdminOrPhotographer,  addImageInVault)
router.post('/update-image-in-vault', IsAdminOrPhotographer,  updateImageInVault)
router.get('/get-image-by-id', getImageFromVault)
router.get('/get-all-images', getAllImagesFromVault)
router.delete('/delete-image', IsAdminOrPhotographer, deleteImagesFromVault)
router.get('/get-images-by-photographer', getAllImagesByPhotographer)
router.get('/get-image-by-category-id', getImagesByCategory)
router.get('/get-image-by-category-type', getImagesByCategoryType)
router.post('/approve-image', isAdmin, approveImage)
router.get('/get-all-pending-images-for-admin', isAdmin, getAllPendingImagesForAdmin)

router.post('/toggle-featured-artwork', isAdmin, toggleFeaturedArtwork)
router.get('/get-featured-artwork', getFeaturedArtwork)

module.exports = router