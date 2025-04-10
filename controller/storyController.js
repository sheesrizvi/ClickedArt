const asyncHandler = require('express-async-handler')
const Story = require('../models/storyModel.js')
const ImageVault = require('../models/imagebase/imageVaultModel.js')
const { sendStoryPublishedMail } = require('../middleware/handleEmail.js')
const Photographer = require('../models/photographerModel.js')
const { generateSlug } = require('../middleware/slugMiddleware.js')
const { compressToExactSizeAndUpload } = require('../middleware/compressMiddleware.js')

const createStory = asyncHandler(async (req, res) => {
    let { title, description, inspiredBy } = req.body

    const storyExist = await Story.findOne({ title })

    if(storyExist) {
        return res.status(400).send({ message: 'Story exist with same title' })
    }
    const image = await ImageVault.findOne({ _id: inspiredBy }).populate('photographer')

    const slug = generateSlug(title)

    const media_url = await compressToExactSizeAndUpload(image.imageLinks.original)
    
    if(image) {
        const photographerName =`${image.photographer.firstName} ${image.photographer.lastName}`
        const email = image.photographer.email
        const story = title
        await sendStoryPublishedMail(photographerName, email, story)
    }

    await Story.create({
        title,
        description,
        media_url,
        inspiredBy,
        slug
    })

    res.status(200).send({ message: 'Story created Successfully' })
})

const updateStory = asyncHandler(async (req, res) => {
    let { storyId, title, description, inspiredBy } = req.body

    const story = await Story.findOne({ _id: storyId })
    if(!story) {
        return res.status(400).send({ message: 'Story not found' })
    }

    if(story.title !== title || !story.slug) {
        const slug = generateSlug(title)
        story.slug = slug
    }
    if(title) story.title = title
    if(description) story.description = description
    
    if(inspiredBy && inspiredBy.toString() !== story.inspiredBy.toString()) {
        story.inspiredBy = inspiredBy
        const image = await ImageVault.findOne({ _id: inspiredBy }).populate('photographer')
        const media_url = await compressToExactSizeAndUpload(image.imageLinks.original)
        story.media_url = media_url

        if(image) {
            const photographerName =`${image.photographer.firstName} ${image.photographer.lastName}`
            const email = image.photographer.email
            const story = title
           // await sendStoryPublishedMail(photographerName, email, story)
        }
    
    } 

    await story.save()

    res.status(200).send({ message: 'Story updated Successfully' })
})

const deleteStory = asyncHandler(async (req, res) => {
    const { storyId } = req.query

    const story = await Story.findById(storyId)
    if(!story) {
        return res.status(400).send({ message: 'Story updated successfully' })
    }

    await Story.findByIdAndDelete(storyId)
    res.status(200).send({ message: 'Story Deleted' })
})

const getAllStory = asyncHandler(async(req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const stories = await Story.find({  }).populate({
        path: 'inspiredBy',
        select: "imageLinks.thumbnail photographer resolutions title description story keywords category photographer license price location cameraDetails featuredArtwork notForSale slug",
        populate: {
            path: 'photographer',
            select: '-bestPhotos'
        }
    }).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

    if(!stories || stories.length === 0) {
        return res.status(400).send({ message:  'Stories not found' })
    }

    const totalDocuments = await Story.countDocuments({})
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ stories, pageCount })
})

const getMyStory = asyncHandler(async (req, res) => {
    const { referredBy } = req.query

    if(!referredBy) {
        return res.status(400).send({ message: 'Referred By is required ' })
    }

    const images = await ImageVault.find({ photographer: referredBy })

    const imageIds = images.map((image) => image._id)

    const stories = await Story.find({ inspiredBy: { $in: imageIds } }).populate({
        path: 'inspiredBy',
        select: "imageLinks.thumbnail photographer resolutions title description story keywords category photographer license price location cameraDetails featuredArtwork notForSale slug",
        populate: {
            path: 'photographer',
            select: '-bestPhotos'
        }
    }).sort({ createdAt: -1 })

    if(!stories || stories.length === 0) {
        return res.status(400).send({ message: 'Story not found' })
    }

    res.status(200).send({ stories })
})

const getStoryById = asyncHandler(async (req, res) => {
    const { storyId } = req.query

    const story = await Story.findById(storyId).populate({
        path: 'inspiredBy',
        select: "imageLinks.thumbnail photographer resolutions title description story keywords category photographer license price location cameraDetails featuredArtwork notForSale slug",
        populate: {
            path: 'photographer',
            select: '-bestPhotos'
        }
    })
    
    if(!story) {
        return res.status(400).send({ message: 'Story not found' })
    }

    res.status(200).send({ story })

})

const getStoryBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.query

    if(!slug) {
        return res.status(400).send({ message: 'Slug is required' })
    }

    const story = await Story.findOne({ slug: { $regex: new RegExp(`^${slug}$`, 'i') } }).populate({
        path: 'inspiredBy',
        select: "imageLinks.thumbnail photographer resolutions title description story keywords category photographer license price location cameraDetails featuredArtwork notForSale slug",
        populate: {
            path: 'photographer',
            select: '-bestPhotos'
        }
    })

    if(!story) {
        return res.status(400).send({ message: 'No Story Found' })
    }

    res.status(200).send({ story })
})

module.exports = {
    createStory,
    updateStory,
    deleteStory,
    getAllStory,
    getMyStory,
    getStoryById,
    getStoryBySlug
}