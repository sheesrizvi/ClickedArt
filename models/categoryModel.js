const mongoose = require("mongoose");
const validator = require('validator')

const categorySchema = mongoose.Schema({
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

const Category = mongoose.model('Category', categorySchema)

module.exports = Category