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
        getFeaturedArtwork,
        searchImages,
        updateImageViewCount,
        getImageAnalytics,
        bestSellerPhotos,
        getRejectedImages,
        getAllImagesFromVaultBySorting,
        updateNotForSaleStatus,
        getImageBySlug,
        getImageForDownload,
        getImagesByEvents,
        getImagesOfEventsByPhotographer,
        getPhotographerByEvents,
        addEventToImage,
        removeEventFromImage,
        selectImageForEvent,
        getSelectImagesForEvent,
        getYearRewindOfPhotographer,
     } = require('../../controller/imagebase/imageVaultController')
const { IsAdminOrPhotographer, isAdmin, verifyToken } = require('../../middleware/authMiddleware')

const router = express.Router()


router.post('/add-image-in-vault', IsAdminOrPhotographer,  addImageInVault)
router.post('/update-image-in-vault',  updateImageInVault)
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
router.get('/search-images', searchImages)

router.post('/add-image-views-count', updateImageViewCount)
router.get('/get-image-analytics', getImageAnalytics)
router.get('/best-seller-photos', bestSellerPhotos)
router.get('/get-rejected-images', getRejectedImages)

router.get('/get-images-by-sort-type', getAllImagesFromVaultBySorting)
router.post('/update-not-for-sale-status', updateNotForSaleStatus)

router.get('/get-image-by-slug', getImageBySlug)
router.get('/get-image-for-download', verifyToken, getImageForDownload)
router.get('/get-images-of-events-by-photographer', getImagesOfEventsByPhotographer)
router.get('/get-images-of-events', getImagesByEvents)
router.get('/get-photographer-by-events', getPhotographerByEvents)
router.post('/add-event-to-image', IsAdminOrPhotographer, addEventToImage)
router.post('/remove-event-from-image', IsAdminOrPhotographer, removeEventFromImage)
router.post('/select-image-for-event', IsAdminOrPhotographer, selectImageForEvent)
router.get('/get-selected-images-of-events', getSelectImagesForEvent)
router.get('/get-year-rewind-of-photographer', getYearRewindOfPhotographer)

module.exports = router