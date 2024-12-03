const mongoose = require("mongoose");

const likeSchema = mongoose.Schema({
     userInfo: { // primary user info
        user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userInfo.userType', required: true }, 
        userType: { type: String, enum: ['User', 'Photographer'], required: true },
    },
    entityInfo: { // entity related Info
        entity: { type: mongoose.Schema.Types.ObjectId, refPath: 'entityInfo.entityType', required: true },
        entityType: { type: String, enum: ['ImageVault'], required: true } // In future might be we add blog after some time
    },
}, {
    timestamps: true
})

const Like = mongoose.model('Like', likeSchema)

module.exports = Like