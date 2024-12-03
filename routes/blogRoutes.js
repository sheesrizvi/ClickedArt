const express = require('express')
const { 
    addBlog,
    updateBlog,
    deleteBlog,
    getAllBlogs,
    getBlogById,
    searchBlog,
    getFeaturedBlogs,
    setBlogAsFeatured
} = require('../controller/socials/blogController')
const router = express.Router()

router.post('/add-blog', addBlog)
router.post('/update-blog', updateBlog)
router.post('/set-blog-as-featured', setBlogAsFeatured)
router.delete('/delete-blog', deleteBlog)
router.get('/get-all-blogs', getAllBlogs)
router.get('/get-blog-by-id', getBlogById)
router.get('/search-blog', searchBlog)
router.get('/get-featured-blogs', getFeaturedBlogs)


module.exports = router