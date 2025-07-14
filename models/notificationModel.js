const mongoose = require('mongoose')

const notificationSchema = mongoose.Schema({
    usersInfo: [{
        user: { type: mongoose.Schema.Types.ObjectId, refPath: 'usersInfo.userType', required: true },
        userType: { type:String, required: true, enum: ['User', 'Photographer'] },
        isRead: { type: Boolean, default: false}
    }],
    message: {
        title: { type: String, required: true },
        body: { type: String, required: true },
        image: { type: String },  
    },
    type: { type: String, required: true, enum: ['like', 'comment', 'follow', 'mention', 'system', 'other'], default: 'other' },
    entityInfo: {
        entity: { type: mongoose.Schema.Types.ObjectId, refPath: 'entityInfo.entityType' },
        entityType: { type: String, enum: ['Post', 'Blog', 'Comment', 'Like'] }
    },
    actorInfo: {
        actor: { type: mongoose.Schema.Types.ObjectId, refPath: 'actorInfo.actor', },
        actorType: { type: String, enum: ['Vendor', 'User'] }
    },
}, { timestamps: true })

const Notification = mongoose.model('Notification', notificationSchema)

module.exports = Notification