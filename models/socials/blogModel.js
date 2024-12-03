const mongoose = require('mongoose')

const blogSchema = mongoose.Schema({
    authorInfo: {
        author: { type: mongoose.Schema.Types.ObjectId, refPath: 'authorInfo.authorType', required: true },
        authorType: { type: String, enum: ['User', 'Photographer', 'Admin'], required: true },
    },
    slug: { type: String },
    content: {
        title: { type: String, required: true },
        summary: { type: String },
        body: { type: String, required: true },
    },
    coverImage: [{ type: String }],
    tags: [{ type: String }],
    featured: { type: Boolean, default: false },
    viewsCount: { type: Number, default:0 },
    type: { type: String, enum: ['Blog'], default: 'Blog' },
    isHide: { type: Boolean, default: false },
}, { timestamps: true })

const Blog = mongoose.model('Blog', blogSchema)

module.exports = Blog