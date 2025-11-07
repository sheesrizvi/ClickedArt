const express = require('express')
const { createCategory, updateCategory, deleteCategory, getAllCategory, getCategoryById, searchCategories, getCategoriesByHighestImageCount } = require('../controller/categoryController')
const { isAdmin } = require('../middleware/authMiddleware')
const router = express.Router()


// Public Routes
router.post('/create-category', isAdmin, createCategory)
router.post('/update-category', isAdmin, updateCategory)
router.delete('/delete-category', isAdmin, deleteCategory)
router.get('/get-by-id', getCategoryById)
router.get('/get', getAllCategory)
router.get('/get-top-categories', getCategoriesByHighestImageCount)
router.get('/search-category', searchCategories)

module.exports = router