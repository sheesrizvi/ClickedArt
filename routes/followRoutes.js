const express = require('express')
const { followUser, unfollowUser, getFollowers, getFollowing, isFollowing } = require('../controller/socials/followController')
const router = express.Router()


router.post('/follow-user', followUser) // @ Follow/Unfollow User Same Route
router.delete('/unfollow-user', unfollowUser) // @ Unfollow User
router.get('/get-followers', getFollowers)// @ Retrieves a list of followers for a specific user
router.get('/get-following', getFollowing)// @ Retrieves a list of following for a specific user
router.get('/is-following', isFollowing)

module.exports = router