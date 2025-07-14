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
    const { userId, userType,  entityInfo  } = req.body
    
   if(!userType || !entityInfo) return res.status(400).send({ message: 'User or Entitiy Details not found' })

   const likeExists = await Like.findOne({
        'userInfo.user': userId,
        'entityInfo.entity': entityInfo?.entity
        })
   
  if(likeExists) {
    const like =  await Like.deleteOne({
       'userInfo.user': userId,
       'entityInfo.entity': entityInfo?.entity
    })
    if(like && like.deletedCount === 1) {
        const entityType = likeExists.entityInfo.entityType
        if(entityType === 'ImageVault') {
           
            await ImageAnalytics.findOneAndUpdate({ image: entityInfo.entity }, { $inc: { likes: -1 } })
        } else {
            // await Blog code if blog added
        }
        return res.status(400).send({ message: 'Like Removed', likeExists: false , like})
    }
}
    const like = await Like.create({
        userInfo: {
            user: userId,
            userType: userType
        },
        entityInfo
    })
    const entityType = like.entityInfo.entityType
    if(entityType === 'ImageVault') {
        
     await ImageAnalytics.findOneAndUpdate({ image: entityInfo.entity }, { $inc: { likes: 1 } })
     const Model = userType === "User" ? User : Photographer
     const user = await Model.findOne({ _id: followerId })
     const title = "You’ve Got a New Like!"
     const body = `${user.firstName} ${user.lastName} liked your body`
     const image = ImageVault.findOne({ _id: entityInfo.entity }).populate('photographer')
     const photographer = image.photographer
     if(photographer._id) {
        sendNotificationsInsideApplicationToSingleUser(photographer._id, photographer.type, title, body).catch(console.error)
     }
   
    } else {
        // await Blog Code for incrementing like count
    }
    
    res.status(200).send({message: 'Like Added', like, likeExists: true})
})


const getLikeCountByEntity = asyncHandler(async (req, res) => {
    const { entityId } = req.query
    if(!entityId) return res.status(400).send({ message: 'Like not found'})

    const likeCount = await Like.countDocuments({ 'entityInfo.entity': entityId })
    
    if(!likeCount) return res.status(400).send({ message: 'No Like Count' })
    res.status(200).send({likeCount})
})

const hasLiked = asyncHandler(async (req, res) => {
    const { userId, entityId } = req.query
    if(!userId || !entityId) return res.status(400).send({ message: 'UserId and EntityId are required' })

   const like =  await Like.findOne({
        'userInfo.user': userId,
        'entityInfo.entity': entityId
    })
    
    if(!like) return res.status(400).send({message: "Like not found"})

    res.status(200).send({ message: 'User has not liked this before' , likeExist: true})
})

const getLikeById = asyncHandler(async (req, res) => {
    const { likeId } = req.query
    if(!likeId) return res.status(400).send({ message: 'Like Id not found' })
    
    const like = await Like.findById(likeId)
    if(!like) return res.status(400).send({ message: 'Like not found' })

    res.status(200).send({like})
})

module.exports =  {
    toggleLike,
    getLikeCountByEntity,
    hasLiked,
    getLikeById
}
