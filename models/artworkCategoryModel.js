const mongoose = require("mongoose");
const validator = require('validator')

const artworkCategorySchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    coverImage: {
        type: String,
        required: true
    },
    tags: [
        {
            type: String
        }
    ]
}, {
    timestamps: true
})

const ArtworkCategory = mongoose.model('ArtworkCategory', artworkCategorySchema)

module.exports = ArtworkCategory