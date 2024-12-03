const express = require('express')
const {
    createComment,
    updateComment,
    deleteComment,
    getCommentByEntity,
} = require('../controller/socials/commentController.js')

const router = express.Router()


router.post('/add-comment', createComment) // adding comment on photos/blog
router.delete('/delete-comment', deleteComment)
router.post('/update-comment', updateComment)
router.get('/get-comment-by-entity', getCommentByEntity) 

module.exports = router