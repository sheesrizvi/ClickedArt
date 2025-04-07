const express = require('express')

const { 
    createCatalogue,
    getAllCatalogues,
    getCatalogueByPhotographer,
    getCatalogueById,
    updateCatalogue,
    removeImagesFromCatalogue,
    deleteCatalogue,
    searchCatalogues,
    updateCatalogueOrder
 } = require('../../controller/imagebase/catalogueController.js')


 const router = express.Router()

 router.post('/create-catalogue', createCatalogue)
 router.post('/update-catalogue', updateCatalogue)
 router.get('/get-catalogue-by-id', getCatalogueById)
 router.get('/get-all-catalogues', getAllCatalogues)
 router.get('/get-catalogues-by-photographer', getCatalogueByPhotographer)
 router.get('/search-catalogue', searchCatalogues)
 router.delete('/delete-catalogue', deleteCatalogue)
 router.post('/remove-images-from-catalogue', removeImagesFromCatalogue)
 router.post('/update-catalogue-order', updateCatalogueOrder)

 module.exports = router