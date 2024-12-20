const mongoose = require('mongoose')
 
const wishlistSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
      },
    images: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ImageVault'
    }]
})

const WishList = mongoose.model('WishList', wishlistSchema)

module.exports = WishList

