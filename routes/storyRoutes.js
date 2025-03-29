const express = require('express')
const { 
    createStory,
    updateStory,
    deleteStory,
    getAllStory,
    getMyStory,
    getStoryById,
    getStoryBySlug
} = require('../controller/storyController')
const router = express.Router()
const { isAdmin } = require('../middleware/authMiddleware.js')



router.post('/add-story',isAdmin, createStory)
router.post('/update-story', isAdmin, updateStory)
router.delete('/delete-story', isAdmin, deleteStory)
router.get('/get-all-story', getAllStory)
router.get('/get-my-story', getMyStory)
router.get('/get-story-by-id', getStoryById)

router.get('/get-story-by-slug', getStoryBySlug)

module.exports = router