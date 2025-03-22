const asyncHandler = require('express-async-handler');
const LayoutContent = require('../models/layoutContentModel.js');
const axios = require('axios')

const addLayoutContent = asyncHandler(async (req, res) => {
    const { logo, heroSectionPhotos, footerDetails, testimonials, support } = req.body;

    const existingContent = await LayoutContent.findOne();
    if (existingContent) {
        return res.status(400).json({ error: 'Layout content already exists' });
    }
   
    const content = await LayoutContent.create({ logo, heroSectionPhotos, footerDetails, testimonials, support });
    res.status(201).send({ message: 'Content created successfully', content });
});

const updateLayoutContent = asyncHandler(async (req, res) => {
    const { logo, heroSectionPhotos, footerDetails, testimonials, support } = req.body;

    const content = await LayoutContent.findOneAndUpdate(
        {},
        { logo, heroSectionPhotos, footerDetails, testimonials, support },
        { new: true, upsert: true }
    );
    res.status(200).send({ message: 'Content updated successfully', content });
});

const getLayoutContent = asyncHandler(async (req, res) => {
    const content = await LayoutContent.findOne().populate({
      path: 'heroSectionPhotos.image',
      populate: {
        path: 'photographer'
      }
    });
    res.status(200).send(content);
});

const getGoogleReviews = asyncHandler(async (req, res) => {
      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
          params: {
            placeid: process.env.GOOGLE_PLACE_ID,
            key: process.env.GOOGLE_MAPS_API_KEY,
          },
        });
       
        return res.status(200).send({ data: response.data })
      } catch (error) {
        console.log(error)
        return res.status(500).send({ message: 'Error fetching data' })
      }
    
})

const deleteLayoutContent = asyncHandler(async (req, res) => {
    const existingContent = await LayoutContent.findOne();
    if (!existingContent) {
       return res.status(404).send({ error: 'No layout content to delete' });
       
    }
    await LayoutContent.deleteOne();
    res.status(200).send({ message: 'Layout content deleted successfully' });
});


module.exports = {
    addLayoutContent,
    getLayoutContent,
    updateLayoutContent,
    deleteLayoutContent,
    getGoogleReviews
}