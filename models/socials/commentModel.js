const mongoose = require('mongoose')

const commentSchema = mongoose.Schema({
    userInfo: { // primary user info
        user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userInfo.userType', required: true }, 
        userType: { type: String, enum: ['User', 'Photographer'], required: true },
    },
    entityInfo: { // entity related Info
        entity: { type: mongoose.Schema.Types.ObjectId, refPath: 'entityInfo.entityType', required: true },
        entityType: { type: String, enum: ['ImageVault', 'Blog'], required: true }
    },
    commentText: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Comment'],
        default: "Comment"
    }
}, {
    timestamps: true
})

const Comment = mongoose.model('Comment', commentSchema)

module.exports = Comment