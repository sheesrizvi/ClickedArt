const asyncHandler = require('express-async-handler')
const Story = require('../models/storyModel.js')

const createStory = asyncHandler(async (req, res) => {
    const { title, description, media_url, referredBy } = req.body

    const storyExist = await Story.findOne({ title })

    if(storyExist) {
        return res.status(400).send({ message: 'Story exist with same title' })
    }

    await Story.create({
        title,
        description,
        media_url,
        referredBy
    })

    res.status(200).send({ message: 'Story created Successfully' })
})

const updateStory = asyncHandler(async (req, res) => {
    const { storyId, title, description, media_url, referredBy } = req.body

    const story = await Story.findOne({ _id: storyId })
    if(!story) {
        return res.status(400).send({ message: 'Story not found' })
    }
    if(title) story.title = title
    if(description) story.description = description
    if(media_url) story.media_url = media_url
    if(referredBy) story.referredBy = referredBy

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

    const stories = await Story.find({  }).populate('referredBy').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

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
    const stories = await Story.find({ referredBy }).sort({ createdAt: -1 })

    if(!stories || stories.length === 0) {
        return res.status(400).send({ message: 'Story not found' })
    }

    res.status(200).send({ stories })
})

const getStoryById = asyncHandler(async (req, res) => {
    const { storyId } = req.query

    const story = await Story.findById(storyId).populate('referredBy')
    if(!story) {
        return res.status(400).send({ message: 'Story not found' })
    }

    res.status(200).send({ story })
})

module.exports = {
    createStory,
    updateStory,
    deleteStory,
    getAllStory,
    getMyStory,
    getStoryById
}