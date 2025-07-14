const asyncHandler = require('express-async-handler');
const CustomUploadImageVault = require('../../models/imagebase/customImageUploadVault');


const addCustomUploadImage = asyncHandler(async (req, res) => {
  const { url, name, uploadedBy, userType } = req.body;
 
  if (!url || !userType) {
    res.status(400);
    throw new Error('Missing required fields');
  }

  const newImage = await CustomUploadImageVault.create({
    url,
    name,
    userType,
    uploadedBy
  });

  res.status(201).json({message: "Custom Image Uploaded", newImage});
});


const updateCustomUploadImage = asyncHandler(async (req, res) => {
  const { name, url } = req.body;
  const image = await CustomUploadImageVault.findById(req.query.id);

  if (!image) {
    res.status(404);
    throw new Error('Image not found');
  }

  if (!image.uploadedBy.equals(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to update this image');
  }

  image.name = name || image.name;
  image.url = url || image.url;

  const updated = await image.save();
  res.json(updated);
});


const deleteCustomUploadImage = asyncHandler(async (req, res) => {
  const image =  await CustomUploadImageVault.findOneAndDelete(req.query.id);

  if (!image) {
    res.status(404);
    throw new Error('Image not found');
  }

  res.json({ message: 'Image deleted' });
});


const getCustomUploadImageById = asyncHandler(async (req, res) => {
  const { id } = req.query
  const image = await CustomUploadImageVault.findById(id);

  if (!image) {
    res.status(404);
    throw new Error('Image not found');
  }

  res.json({ image });
});


const getCustomUploadsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.query
  const uploads = await CustomUploadImageVault.find({
    uploadedBy: userId
  }).populate('uploadedBy')

  res.json({uploads});
});


const getAllCustomUploads = asyncHandler(async (req, res) => {
  const uploads = await CustomUploadImageVault.find().sort({ createdAt: -1 });
  res.json({ uploads });
});

module.exports = {
  addCustomUploadImage,
  updateCustomUploadImage,
  deleteCustomUploadImage,
  getCustomUploadImageById,
  getCustomUploadsByUser,
  getAllCustomUploads,
};
