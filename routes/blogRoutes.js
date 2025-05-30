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
    getMySuccessStory,
    updateBlogStatus,
    getAllPendingBlogs,
    getMyBlogs,
    getBlogBySlug,
    getMyPendingBlogs
} = require('../controller/socials/blogController')

const router = express.Router()
const { isAdmin } = require('../middleware/authMiddleware')

router.post('/add-blog', addBlog)
router.post('/update-blog', updateBlog)
router.post('/set-blog-as-featured', setBlogAsFeatured)
router.delete('/delete-blog', deleteBlog)
router.get('/get-all-blogs', getAllBlogs)
router.get('/get-all-success-stories', getAllSuccessStories)
router.get('/search-success-story', searchSuccessStory)
router.get('/get-blog-by-id', getBlogById)
router.get('/search-blog', searchBlog)
router.get('/get-featured-blogs', getFeaturedBlogs)
router.get('/get-my-success-story', getMySuccessStory)
router.post('/update-blog-status', updateBlogStatus)
router.get('/get-pending-blogs', getAllPendingBlogs)
router.get('/get-my-blogs', getMyBlogs)
router.get('/get-my-pending-blogs', getMyPendingBlogs)

router.get('/get-blog-by-slug', getBlogBySlug)
module.exports = router