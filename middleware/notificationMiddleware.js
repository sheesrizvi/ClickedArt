const User = require("../models/userModel.js")
const Photographer = require('../models/photographerModel.js')
const asyncHandler = require('express-async-handler')
const Follow = require('../models/socials/followModel.js')
const Like = require('../models/socials/likeModel.js')

const getAllFollowers = asyncHandler(async (userId) => {    
   
})

const getAllFollowings = asyncHandler(async (userId) => {
    
})

const getFollowersCount = asyncHandler(async (userId) => {
   
})

const getFollowingCount = asyncHandler(async (userId) => {
   
})

const getLikedCount = async (entityId) => {
  
   
}

const hasLiked = async (entityId, userId) => {
   
   
}

const isFollowing = async (followerId, followingId) => {
   
   
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