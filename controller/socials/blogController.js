const Blog = require('../../models/socials/blogModel.js')
const Like = require('../../models/socials/likeModel.js')
const Comment  = require("../../models/socials/commentModel.js")
const UserType= require('../../models/typeModel.js')
const asyncHandler = require('express-async-handler')
const Admin = require('../../models/adminModel.js')
const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { S3Client } = require('@aws-sdk/client-s3')
const { generateSlug } = require('../../middleware/slugMiddleware.js')

const addBlog = asyncHandler(async (req, res) => {
    const { authorInfo, content, coverImage, tags, photographer, achievements, blogType, createdBy, isActive  } = req.body
    
    if(!authorInfo || !content || !coverImage) return res.status(400).send({ message: 'All Fields are required'})
    
    const slug = generateSlug(content.title)
    let blog 
    console.log('running')
    if(blogType === 'successstory') {
        blog = new Blog({
            authorInfo,
            slug,
            content,
            coverImage,
            tags,
            photographer,
            achievements,
            blogType,
            createdBy,
            isActive
        })
    } else {
        blog = new Blog({
            authorInfo,
            slug,
            content,
            coverImage,
            tags,
            createdBy,
            isActive
        })
    }
        
    
 
    await blog.save()

    res.status(200).send({ message: 'Blog created successfully', blog })
})

const updateBlog = asyncHandler(async (req, res) => {
    const {blogId, slug, content, coverImage, tags, photographer, achievements, isActive, authorInfo  } = req.body
    const blog = await Blog.findOne({ _id: blogId })
    if(!blog) return res.status(400).send({ message: 'Blog not found' })
        
    if(blog.content?.title !== content?.title || !blog.slug) {
        const slug = generateSlug(content.title)
        blog.slug = slug
    }
        
    blog.content = content ?? blog.content
    blog.coverImage = coverImage ?? blog.coverImage
    blog.isActive = isActive ?? blog.isActive
    blog.authorInfo = authorInfo ?? blog.authorInfo
    
    blog.tags = tags ?? blog.tags
    
    if(blog.blogType === 'successstory') {
        blog.achievements = achievements ?? blog.achievements
        blog.photographer = photographer ?? blog.photographer
    }

    await blog.save()

    res.status(200).send({ message: 'Blog update successfull', blog })
})

const deleteBlog = asyncHandler(asyncHandler(async (req, res) => {
    const { blogId } = req.query

    const blog = await Blog.findOne({ _id: blogId  })
    if(!blog) return res.status(400).send({ message: 'No Blog found' })


    if(blog && blog.coverImage && blog.coverImage.length > 0) {
        for(let f1 of blog.coverImage) {
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
    }

    await Blog.findOneAndDelete({ _id: blogId })

    res.status(200).send({ message: 'Blog Deleted successfully' })

}))

const getBlogById = asyncHandler(async (req, res) => {
    const { id } = req.query
    let blog = await Blog.findOne({ _id: id }).populate('authorInfo.author').populate('photographer')

    if(!blog) return res.status(400).send({ message: 'Blog not found' })
    
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

    const totalDocuments = await Blog.countDocuments({ blogType: 'blog', isActive: true })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    const blogs = await Blog.find({ blogType: 'blog', isActive: true }).populate('authorInfo.author').populate('photographer').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

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


const getAllSuccessStories = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const totalDocuments = await Blog.countDocuments({ blogType: 'successstory', isActive: true })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    const blogs = await Blog.find({ blogType: 'successstory', isActive: true }).populate('authorInfo.author').populate('photographer').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

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
    
   
    res.status(200).send({ successstories : newBlogs, pageCount })
})

const getBlogsByTags = asyncHandler(async (req, res) => {
    const { requesterId, tag } = req.query
    if(!requesterId || !tag) return res.status(400).send({ message: 'RequesterId or Tag not found' })
    const blogs = await Blog.find({ tags: { $regex: tag, $options: 'i' }, blogType: 'blog', isActive: true }).populate('authorInfo.author','name email').populate('photographer')

    if(blogs.length === 0) return res.status(400).send({ message: 'Blog not found' })
    res.status(200).send({ message: 'Blogs found with this tag', blogs })
})

const searchBlog = asyncHandler(async (req, res) => {
    const { Query: query } = req.query
    if(!query) return res.status(400).send({ message: 'Query is must' })
    const blogs = await Blog.find({
        $and: [
            {
                $or: [
                    { 'content.title': { $regex: query, $options: 'i' } },
                    { 'content.summary': { $regex: query, $options: 'i' } },
                    { 'content.body': { $regex: query, $options: 'i' } },
                    { 'tags': { $regex: query, $options: 'i' } },
                ]
            },
            {
                blogType: 'blog'
            },
            {
                isActive: true
            }
        ]
       
    }).populate('authorInfo.author').populate('photographer').sort({ createdAt: -1 })
    res.status(200).send({ message: 'Blog not found', blogs})
})

const searchSuccessStory = asyncHandler(async (req, res) => {
    const { Query: query } = req.query
    if(!query) return res.status(400).send({ message: 'Query is must' })
    const blogs = await Blog.find({
        $and: [
            {
                $or: [
                    { 'content.title': { $regex: query, $options: 'i' } },
                    { 'content.summary': { $regex: query, $options: 'i' } },
                    { 'content.body': { $regex: query, $options: 'i' } },
                    { 'tags': { $regex: query, $options: 'i' } },
                ]
            },
            {
                blogType: 'successstory'
            },
            {
                isActive: true
            }
        ]
       
    }).populate('authorInfo.author').populate('photographer').sort({ createdAt: -1 })
    res.status(200).send({ message: 'Blog not found', successstories:blogs})
})

const setBlogAsFeatured = asyncHandler(async (req, res) => {
    const { blogId, adminId, featuredStatus } = req.body
    
    const admin = await Admin.findById(adminId)
    if(!admin) return res.status(400).send({message: 'Admin not found'})

    const blog = await Blog.findById(blogId).populate('photographer')
    if(!blog) return res.status(200).send({ status: "Blog Not found" })
    blog.featured = featuredStatus
    await blog.save()
    return res.status(200).send({ message:'Blog marked as featured' })
    
})

const getFeaturedBlogs = asyncHandler(async (req, res) => {
    const page = req.query.pageNumber || 1
    const pageSize = req.query.pageSize || 20

    const totalDocuments = await Blog.countDocuments({ featured: true, isActive: true })
    const pageCount = Math.ceil(totalDocuments/pageSize)
    const blogs = await Blog.find({ featured: true, isActive: true}).populate({
        path: 'authorInfo.author'
    }).populate('photographer').sort({
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

const getMySuccessStory = asyncHandler(async (req, res) => {
    const { user, pageNumber = 1, pageSize = 20 } = req.query

    const successstory = await Blog.find({ photographer: user, isActive: true }).populate('photographer').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

    if(!successstory || successstory.length === 0) {
        return res.status(400).send({ message: 'No SuccessStory found for this photographer' })
    }
    const totalDocuments = await Blog.countDocuments({ photographer: user, isActive: true })

    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ successstory, pageCount })

})


const updateBlogStatus = asyncHandler(async (req, res) => {
    const { bool, blogId  } = req.body
    
    const blog = await Blog.findOne({ _id: blogId })

    blog.isActive = bool

    await blog.save()

    res.status(200).send({ message: 'Blog updated successfully' })
})

const getAllPendingBlogs = asyncHandler(async(req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const blogs = await Blog.find({ isActive: false }).populate('authorInfo.author').populate('photographer').skip((pageNumber - 1) * pageSize).limit(pageSize)

    if(!blogs || blogs.length === 0) {
        return res.status(400).send({ message: 'Blog not found' })
    }

    const totalDocuments = await Blog.countDocuments({ isActive: false })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ blogs, pageCount })
})

const getMyBlogs = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20, author } = req.query
    
    const totalDocuments = await Blog.countDocuments({ blogType: 'blog', isActive: true, 'authorInfo.author': author })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    const blogs = await Blog.find({ blogType: 'blog', isActive: true, 'authorInfo.author': author }).populate('authorInfo.author').populate('photographer').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

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

const getMyPendingBlogs = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20, author } = req.query
    
    const totalDocuments = await Blog.countDocuments({ blogType: 'blog', isActive: false, 'authorInfo.author': author })

    const pageCount = Math.ceil(totalDocuments/pageSize)

    const blogs = await Blog.find({ blogType: 'blog', isActive: false, 'authorInfo.author': author }).populate('authorInfo.author').populate('photographer').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

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

const getBlogBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.query

    if(!slug) {
        return res.status(400).send({ message: 'Slug is required' })
    }

    const blog = await Blog.findOne({ slug: { $regex: new RegExp(`^${slug}$`, 'i') } }).populate('authorInfo.author').populate('photographer')

    if(!blog) {
        return res.status(400).send({ message: 'Blog not found' })
    }

    res.status(200).send({ blog })
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
    getMySuccessStory,
    getAllSuccessStories,
    searchSuccessStory,
    updateBlogStatus,
    getAllPendingBlogs,
    getMyBlogs,
    getMyPendingBlogs,
    getBlogBySlug
}