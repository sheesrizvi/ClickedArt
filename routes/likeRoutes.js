const express = require('express')
const { toggleLike, getLikeCountByEntity, hasLiked, getLikeById } = require('../controller/socials/likeController')
const router = express.Router()

router.post('/toggle-like', toggleLike)
router.get('/get-like-by-entity', getLikeCountByEntity)
router.get('/has-liked', hasLiked)
router.get('/get-like-by-id', getLikeById)

module.exports = router