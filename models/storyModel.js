const mongoose = require('mongoose')

const storySchema = mongoose.Schema({
    title: {
        type: String
    },
    description: {
        type: String
    },
    media_url: {
        type: String
    },
    inspiredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ImageVault',
        default: null
    },
    expiration_time: {
        type: Date
    },
    slug: {
        type: String
    }
}, { timestamps: true })

const Story = mongoose.model('Story', storySchema)

module.exports = Story