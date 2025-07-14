const asyncHandler = require('express-async-handler')
const Like = require('../../models/socials/likeModel.js')
const UserType= require('../../models/typeModel.js')
const ImageAnalytics = require('../../models/imagebase/imageAnalyticsModel.js')
const User = require('../../models/userModel.js')
const Photographer = require('../../models/photographerModel.js')
const ImageVault = require('../../models/imagebase/imageVaultModel.js')
const {  
    getAllFollowers,
    getAllFollowings,
    getLikedCount } = require('../../middleware/notificationMiddleware.js')
const { sendGroupedNotifications, sendNotificationsInsideApplicationToSingleUser } = require('../notificationController.js')


const toggleLike = asyncHandler(async (req, res) => {
    
})


const getLikeCountByEntity = asyncHandler(async (req, res) => {
   
})

const hasLiked = asyncHandler(async (req, res) => {

 
})

const getLikeById = asyncHandler(async (req, res) => {
   
})

module.exports =  {
    toggleLike,
    getLikeCountByEntity,
    hasLiked,
    getLikeById
}
