const asyncHandler = require('express-async-handler')
const Like = require('../../models/socials/likeModel.js')
const UserType= require('../../models/typeModel.js')
const ImageAnalytics = require('../../models/imagebase/imageAnalyticsModel.js')


const toggleLike = asyncHandler(async (req, res) => {
    const { userId, entityInfo  } = req.body
    const userType = await UserType.findOne({ user: userId }).select('type -_id')
    const type = userType?.type || null;
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
            userType: type
        },
        entityInfo
    })
    const entityType = like.entityInfo.entityType
    if(entityType === 'ImageVault') {
        
     await ImageAnalytics.findOneAndUpdate({ image: entityInfo.entity }, { $inc: { likes: 1 } })
   
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

    res.status(200).send({ message: 'Like relation exist bwn user and entity' , likeExist: true})
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
