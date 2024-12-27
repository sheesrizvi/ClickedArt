const express = require('express')
const { 
    addBlog,
    updateBlog,
    deleteBlog,
    getAllBlogs,
    getBlogById,
    searchBlog,
    getFeaturedBlogs,
    setBlogAsFeatured,
    getAllSuccessStories,
    searchSuccessStory,
    getMySuccessStory
} = require('../controller/socials/blogController')

const router = express.Router()
const { isAdmin } = require('../middleware/authMiddleware')

router.post('/add-blog', isAdmin, addBlog)
router.post('/update-blog', isAdmin, updateBlog)
router.post('/set-blog-as-featured', isAdmin, setBlogAsFeatured)
router.delete('/delete-blog', isAdmin, deleteBlog)
router.get('/get-all-blogs', getAllBlogs)
router.get('/get-all-success-stories', getAllSuccessStories)
router.get('/search-success-story', searchSuccessStory)
router.get('/get-blog-by-id', getBlogById)
router.get('/search-blog', searchBlog)
router.get('/get-featured-blogs', getFeaturedBlogs)
router.get('/get-my-success-story', getMySuccessStory)


module.exports = router