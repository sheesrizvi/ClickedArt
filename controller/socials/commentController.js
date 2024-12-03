const Comment  = require("../../models/socials/commentModel.js")
const UserType= require('../../models/typeModel.js')
const ImageAnalytics = require('../../models/imagebase/imageAnalyticsModel.js')
const asyncHandler = require('express-async-handler')


const createComment = asyncHandler(async (req, res) => {
    const { userId, entityInfo, commentText } = req.body

    if (!userId || !entityInfo || !commentText || !entityInfo.entityType) return res.status(400).send({ message: 'Comment Details are required' })
    const userType = await UserType.findOne({ user: userId }).select('type -_id')
    const type = userType?.type || null;
    console.log(type)
    if (!userType) return res.status(400).send({ message: 'User not found' })

    const commentExist = await Comment.findOne({
        'userInfo.user': userId,
        "entityInfo.entity": entityInfo?.entity
    })

    if (commentExist) return res.status(400).send({ message: 'You have already comment here!!' })


    const comment = await Comment.create({
        userInfo: {
            user: userId,
            userType: type
        },
        entityInfo,
        commentText
    })

    const entityType = comment.entityInfo.entityType
    if(entityType === 'ImageVault') {    
     await ImageAnalytics.findOneAndUpdate({ image: entityInfo.entity }, { $inc: { comments: 1 } })
    } else {
        // await Blog Code for incrementing like count
    }
    res.status(200).send({ message: 'Comment created successfully', comment })

})

const deleteComment = asyncHandler(async (req, res) => {
    const { userId, commentId } = req.query

    const comment = await Comment.findOne({
        'userInfo.user': userId,
        _id: commentId
    })

    if (!comment) return res.status(400).send({ message: 'Comment not found' })


    await Comment.findOneAndDelete({
        'userInfo.user': userId,
        _id: commentId
    })

    const entityType = comment.entityInfo.entityType
    if(entityType === 'ImageVault') {    
     await ImageAnalytics.findOneAndUpdate({ image: comment.entityInfo.entity }, { $inc: { comments: -1 } })
    } else {
        // await Blog Code for incrementing like count
    }

    res.status(200).send({ message: 'Comment Delete Successfully' })
})

const updateComment = asyncHandler(async (req, res) => {
    const { userId, commentId, commentText } = req.body

    if (!userId || !commentId || !commentText) return res.status(400).send({ message: 'Comment Details Required' })

    const comment = await Comment.findOne({
        _id: commentId,
        'userInfo.user': userId
    })

    if (!comment) return res.status(400).send({ message: 'Comment not found ' })

    comment.commentText = commentText || comment.commentText
    await comment.save()

    res.status(200).send({ message: 'Comment update successfull', comment })
})

const getCommentByEntity = asyncHandler(async (req, res) => {
    const { entityId, pageNumber=1, pageSize = 20 } = req.query

    if (!entityId) return res.status(400).send({ message: 'Entity Id is required' })

    const comments = await Comment.find({
        'entityInfo.entity': entityId
    }).populate('userInfo.user').populate('entityInfo.entity').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

    if (!comments || comments.length === 0) return res.status(400).send({ message: 'Comments not found' })

    const totalDocuments = await Comment.countDocuments({'entityInfo.entity': entityId})
    const pageCount = Math.ceil(totalDocuments/pageSize)
    res.status(200).send({ message: "Comments found", comments, pageCount })
})



module.exports = {
    createComment,
    updateComment,
    deleteComment,
    getCommentByEntity
}