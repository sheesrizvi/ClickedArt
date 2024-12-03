const Blog = require('../../models/socials/blogModel.js')
const Like = require('../../models/socials/likeModel.js')
const Comment  = require("../../models/socials/commentModel.js")
const UserType= require('../../models/typeModel.js')
const asyncHandler = require('express-async-handler')
const Admin = require('../../models/adminModel.js')
const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { S3Client } = require('@aws-sdk/client-s3')


const addBlog = asyncHandler(async (req, res) => {
    const { authorInfo, slug, content, coverImage, tags } = req.body
    if(!authorInfo || !content || !coverImage) return res.status(400).send({ message: 'All Fields are required'})
   
        
    const blog = new Blog({
        authorInfo,
        slug,
        content,
        coverImage,
        tags
    })

    await blog.save()

    res.status(200).send({ message: 'Blog created successfully', blog })
})

const updateBlog = asyncHandler(async (req, res) => {
    const {authorId, blogId, slug, content, coverImage, tags  } = req.body

    const blog = await Blog.findOne({ _id: blogId, 'authorInfo.author' : authorId })
    if(!blog) return res.status(400).send({ message: 'Blog not found' })

    blog.slug = slug || blog.slug
    blog.content = content || blog.content
    if (coverImage && Array.isArray(coverImage)) {
        blog.coverImage.push(...coverImage);
        await blog.save()
    }
    blog.tags = tags || blog.tags

    await blog.save()

    res.status(200).send({ message: 'Blog update successfull', blog })
})

const deleteBlog = asyncHandler(asyncHandler(async (req, res) => {
    const { authorId, blogId } = req.body
    const blog = await Blog.findOne({ _id: blogId, 'authorInfo.author' : authorId })
    if(!blog) return res.status(400).send({ message: 'No Blog found' })
    const f1 = blog.coverImage
    if (f1) {

        const config = {
            region: process.env.AWS_BUCKET_REGION,
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY,
              secretAccessKey: process.env.AWS_SECRET_KEY,
            },
          };
        const s3 = new S3Client(config);

        const fileName = f1.split("//")[1].split("/")[1];
      
        const command = new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: fileName,
        });
        const response = await s3.send(command);
       
    }
    await Blog.findOneAndDelete({ _id: blogId, 'authorInfo.author' : authorId })
    res.status(200).send({ message: 'Blog Deleted successfully' })

}))

const getBlogById = asyncHandler(async (req, res) => {
    const { id } = req.query
    let blog = await Blog.findOne({ _id: id }).populate('authorInfo.author')

    if(!blog) return res.status(400).send({ message: 'Image not found' })
    
    // const likeExist = await Like.findOne({ 'entityInfo.entity': id, 'userInfo.user': requesterId })
    // const commentExist = await Comment.findOne({ 'entityInfo.entity': id, 'userInfo.user': requesterId  })
   
    blog = {
        ...blog.toObject(),
        // hasLiked: !!likeExist,
        // hasCommented: !!commentExist
    }
    res.status(200).send({ blog })
})



const getAllBlogs = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const totalDocuments = await Blog.countDocuments({})
    const pageCount = Math.ceil(totalDocuments/pageSize)

    const blogs = await Blog.find({}).populate('authorInfo.author').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

    const newBlogs = await Promise.all(
        blogs.map(async (blog) => {
            // const likeExist = await Like.findOne({ 'entityInfo.entity': blog._id, 'userInfo.user': requesterId });
            // const commentExist = await Comment.findOne({ 'entityInfo.entity': blog._id, 'userInfo.user': requesterId });
          
            return {
                ...blog.toObject(),
                // hasLiked: !!likeExist,
                // hasCommented: !!commentExist,
            };
        })
    );
    
   
    res.status(200).send({ blogs : newBlogs, pageCount })
})




const getBlogsByTags = asyncHandler(async (req, res) => {
    const { requesterId, tag } = req.query
    if(!requesterId || !tag) return res.status(400).send({ message: 'RequesterId or Tag not found' })
    const blogs = await Blog.find({ tags: { $regex: tag, $options: 'i' } }).populate('authorInfo.author','name email')

    if(blogs.length === 0) return res.status(400).send({ message: 'Blog not found' })
    res.status(200).send({ message: 'Blogs found with this tag', blogs })
})

const searchBlog = asyncHandler(async (req, res) => {
    const { Query: query } = req.query
    if(!query) return res.status(400).send({ message: 'Query is must' })
    const blogs = await Blog.find({
        $or: [
            { 'content.title': { $regex: query, $options: 'i' } },
            { 'content.summary': { $regex: query, $options: 'i' } },
            { 'content.body': { $regex: query, $options: 'i' } },
            { 'tags': { $regex: query, $options: 'i' } },
        ]
    }).populate('authorInfo.author')
    res.status(200).send({ message: 'Blog not found', blogs})
})

const setBlogAsFeatured = asyncHandler(async (req, res) => {
    const { blogId, adminId, featuredStatus } = req.body
    
    const admin = await Admin.findById(adminId)
    if(!admin) return res.status(400).send({message: 'Admin not found'})

    const blog = await Blog.findById(blogId)
    if(!blog) return res.status(200).send({ status: "Blog Not found" })
    blog.featured = featuredStatus
    await blog.save()
    return res.status(200).send({ message:'Blog marked as featured' })
    
})

const getFeaturedBlogs = asyncHandler(async (req, res) => {
    const page = req.query.pageNumber || 1
    const pageSize = req.query.pageSize || 20

    const totalDocuments = await Blog.countDocuments({ featured: true })
    const pageCount = Math.ceil(totalDocuments/pageSize)
    const blogs = await Blog.find({ featured: true }).populate({
        path: 'authorInfo.author'
    }).sort({
        createdAt: -1
    }).skip((page-1) * pageSize).limit(pageSize)

    if(blogs.length === 0) return res.status(400).send({
        message:'Featured Blogs not found'
    })

    res.status(200).send({
        blogs,
        pageCount
    })
})



module.exports =  {
    addBlog,
    updateBlog,
    deleteBlog,
    getAllBlogs,
    getBlogById,
    getBlogsByTags,
    searchBlog,
    setBlogAsFeatured,
    getFeaturedBlogs,
}