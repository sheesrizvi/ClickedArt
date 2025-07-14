const User = require("../models/userModel.js")
const Photographer = require('../models/photographerModel.js')
const asyncHandler = require('express-async-handler')
const Follow = require('../models/socials/followModel.js')
const Like = require('../models/socials/likeModel.js')

const getAllFollowers = asyncHandler(async (userId) => {    
    if(!userId) return []
    const [followerDetails] = await Promise.all(
        [
          Follow.find({ 'followingInfo.user': userId }).populate({
                path: 'followerInfo.user',
            })
        ]
    )

    
    
    if(!followerDetails || followerDetails.length === 0) return []
    const followers = followerDetails.map((follow) => (follow.followerInfo.user))
    return followers
})

const getAllFollowings = asyncHandler(async (userId) => {
     const [followingDetails] = await Promise.all(
        [
            Follow.find({
                'followerInfo.user': userId
            }).populate(
                {
                    path: 'followingInfo.user',
                }
                
            )
        ]
    )
    if(!followingDetails || followingDetails.length === 0) return 
    
    const following = followingDetails.map((follow) => (follow.followingInfo.user))
    return following
})

const getFollowersCount = asyncHandler(async (userId) => {
    if(!userId) return 0
    const [countDocuments] = await Promise.all(
        [
           Follow.countDocuments({ 'followingInfo.user': userId })
        ]
    )
 
    return countDocuments || 0
})

const getFollowingCount = asyncHandler(async (userId) => {
    const [countDocuments] = await Promise.all(
            [
                Follow.countDocuments({
                    'followerInfo.user': userId
                })
            ]
        )

        return countDocuments || 0
})

const getLikedCount = async (entityId) => {
  
    if(!entityId) return 0

    const likeCount = await Like.countDocuments({ 'entityInfo.entity': entityId })
    
    return likeCount || 0
   
}

const hasLiked = async (entityId, userId) => {
   
    if(!userId || !entityId) return false

   const like =  await Like.findOne({
        'userInfo.user': userId,
        'entityInfo.entity': entityId
    })
    
    return !!like
}

const isFollowing = async (followerId, followingId) => {
   
    if(!followerId || !followingId) return false
    
    const isUserFollowed = await Follow.findOne({ 'followerInfo.user': followerId, 'followingInfo.user': followingId })
    if(!isUserFollowed) return false
    
    return true
}




module.exports = {
    getAllFollowers,
    getAllFollowings,
    getFollowersCount,
    getFollowingCount,
    getLikedCount,
    hasLiked,
    isFollowing
}