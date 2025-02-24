const mongoose = require('mongoose')
 
const wishlistSchema = mongoose.Schema({
     userInfo: { 
            user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userInfo.userType', required: true }, 
            userType: { type: String, enum: ['User', 'Photographer'], required: true },
    },
    images: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ImageVault'
    }]
})

const WishList = mongoose.model('WishList', wishlistSchema)

module.exports = WishList

