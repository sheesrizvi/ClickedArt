const asyncHandler = require('express-async-handler');
const LayoutContent = require('../models/layoutContentModel.js');

const addLayoutContent = asyncHandler(async (req, res) => {
    const { logo, heroSectionPhotos, footerDetails, testimonials } = req.body;

    const existingContent = await LayoutContent.findOne();
    if (existingContent) {
        return res.status(400).json({ error: 'Layout content already exists' });
    }
   
    const content = await LayoutContent.create({ logo, heroSectionPhotos, footerDetails, testimonials });
    res.status(201).send({ message: 'Content created successfully', content });
});

const updateLayoutContent = asyncHandler(async (req, res) => {
    const { logo, heroSectionPhotos, footerDetails, testimonials } = req.body;

    const content = await LayoutContent.findOneAndUpdate(
        {},
        { logo, heroSectionPhotos, footerDetails, testimonials },
        { new: true, upsert: true }
    );
    res.status(200).send({ message: 'Content updated successfully', content });
});

const getLayoutContent = asyncHandler(async (req, res) => {
    const content = await LayoutContent.findOne();
    res.status(200).send(content);
});


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
    deleteLayoutContent
}