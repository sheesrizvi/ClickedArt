const mongoose = require('mongoose')
const asyncHandler = require("express-async-handler")
const ImageVault = require('../../models/imagebase/imageVaultModel.js')
const Category = require('../../models/categoryModel.js')
const ImageAnalytics = require('../../models/imagebase/imageAnalyticsModel.js')
const Like = require('../../models/socials/likeModel.js')
const Comment = require('../../models/socials/commentModel.js')
const Follow = require('../../models/socials/followModel.js')
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const Photographer = require('../../models/photographerModel.js')
const RoyaltySettings = require('../../models/imagebase/royaltyModel.js')

const config = {
    region: process.env.AWS_BUCKET_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
  };
  
const s3 = new S3Client(config);

const addImageInVault = asyncHandler(async (req, res) => {
  const { category, photographer, imageLinks, resolutions, description, story, keywords, location, photoPrivacy, watermark, cameraDetails, price, exclusivityDetails, identifiableData, license, title } = req.body

  if(!category || !photographer || !imageLinks ) return res.status(400).send({ message: 'Mandatory Fields are required' })
 
  const royaltyShare = await RoyaltySettings.findOne({ licensingType: 'exclusive' })
  const sizePricingModifiers = royaltyShare.sizePricingModifiers;

  const prices = {}
  prices.original = price
  if(imageLinks.medium) {
    prices.medium = price * (1 + sizePricingModifiers.medium / 100); 
  }
  prices.small = price * (1 + sizePricingModifiers.small / 100);  


  const newImage = await ImageVault.create({
    category, photographer, imageLinks, resolutions, title, description, keywords, 
    location, 
    story,
    license,
    photoPrivacy, watermark, cameraDetails, price: prices, 
    exclusivityDetails, 
    identifiableData
  })

  await ImageAnalytics.create({
    image: newImage._id
  })

 
 await Photographer.findOneAndUpdate({_id: photographer}, { $inc: { photosCount: 1 } })
 res.status(201).send({ photo: newImage })
})

const updateImageInVault = asyncHandler(async (req, res) => {
    const { id, category, photographer, imageLinks, resolutions, title, description, story, keywords, location, photoPrivacy, watermark, cameraDetails, price, exclusivityDetails, identifiableData, license } = req.body

    if(!category || !photographer || !imageLinks || !id ) return res.status(400).send({ message: 'Mandatory Fields are required' })

    const photo = await ImageVault.findOne({ _id: id, photographer })
    if(!photo) return res.status(400).send({  message: 'Photo not found' })

  
   photo.category = category || photo.category
   photo.imageLinks = imageLinks || photo.imageLinks
   photo.resolutions = resolutions || photo.resolutions
   photo.description = description || photo.description
   photo.title = title || photo.title
   photo.keywords = keywords || photo.keywords
   photo.location = location || photo.location
   photo.privacy = photoPrivacy || photo.photoPrivacy
   photo.watermark = watermark || photo.watermark
   photo.cameraDetails = cameraDetails || photo.cameraDetails
   photo.exclusivityDetails = exclusivityDetails || photo.exclusivityDetails
   photo.identifiableData = identifiableData || photo.identifiableData
   photo.story = story || photo.story
   photo.license = license || photo.license

   const prices = {}
   if(price) {
    const royaltyShare = await RoyaltySettings.findOne({ licensingType: 'exclusive' })
    const sizePricingModifiers = royaltyShare.sizePricingModifiers;

    prices.original = price
    if(imageLinks.medium) {
      prices.medium = price * (1 + sizePricingModifiers.medium / 100); 
    }
    prices.small = price * (1 + sizePricingModifiers.small / 100);  
  
   }
   photo.price = prices || photo.price

   await photo.save()
  
   

   await photo.save()

   res.status(201).send({ photo })
})

const getImageFromVault = asyncHandler(async (req, res) => {
    const { id } = req.query

    let image = await ImageVault.findOne({ _id: id }).populate('photographer category license')

    if(!image) return res.status(400).send({ message: 'Image not found' })
    
    // const likeExist = await Like.findOne({ 'entityInfo.entity': id, 'userInfo.user': requesterId })
    // const commentExist = await Comment.findOne({ 'entityInfo.entity': id, 'userInfo.user': requesterId  })
    const imageAnalytics = await ImageAnalytics.findOne({ image: id })
    image = {
        ...image.toObject(),
        imageAnalytics,
    }
    res.status(200).send({ photo: image })
})


const getAllImagesFromVault = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const totalDocuments = await ImageVault.countDocuments({ isActive: true })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    const images = await ImageVault.find({ isActive: true }).populate('category photographer license').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
   
    const newImages = await Promise.all(
        images.map(async (image) => {
            // const likeExist = await Like.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
            // const commentExist = await Comment.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
            const imageAnalytics = await ImageAnalytics.findOne({ image: image._id })
            return {
                ...image.toObject(),
                imageAnalytics,
                // hasLiked: !!likeExist,
                // hasCommented: !!commentExist,
            };
        })
    );
    
   
    res.status(200).send({ photos : newImages, pageCount })
})

const getAllImagesByPhotographer = asyncHandler(async (req, res) => {
    const { photographer, pageNumber = 1, pageSize = 20 } = req.query

    const photos = await ImageVault.find({ photographer, isActive: true }).populate('category photographer license').sort({createdAt: -1}).skip((pageNumber - 1) * pageSize).limit(pageSize)

    if(!photos || photos.length === 0) return res.status(400).send({ message: 'Photos not found' })

    const totalDocuments = await ImageVault.countDocuments({ photographer, isActive: true })
    const pageCount = Math.ceil(totalDocuments/pageSize)
    

    const newPhotos = await Promise.all(
        photos.map( async (image) => {
            // const likeExist = await Like.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
            // const commentExist = await Comment.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
            const imageAnalytics = await ImageAnalytics.findOne({ image: image._id })
            return {
                ...image.toObject(),
                imageAnalytics,
                // hasLiked: !!likeExist,
                // hasCommented: !!commentExist,
            };
        })
    )
    
    res.status(200).send({ message: 'Images by Photographer', photos: newPhotos, pageCount })
})

const getImagesByCategory = asyncHandler(async(req, res) => {
    const { category, pageNumber = 1, pageSize = 20 } = req.query

    const photos = await ImageVault.find({ category, isActive: true }).populate('category photographer license').sort({createdAt: -1}).skip((pageNumber - 1) * pageSize).limit(pageSize)

    if(!photos || photos.length === 0) return res.status(400).send({ message: 'Photos not found' })


    const totalDocuments = await ImageVault.countDocuments({ category, isActive: true })
    const pageCount = Math.ceil(totalDocuments/pageSize)
        
    const newPhotos = await Promise.all(
        photos.map( async (image) => {
            // const likeExist = await Like.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
            // const commentExist = await Comment.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
            const imageAnalytics = await ImageAnalytics.findOne({ image: image._id })
            return {
                ...image.toObject(),
                imageAnalytics,
                // hasLiked: !!likeExist,
                // hasCommented: !!commentExist,
            };
        })
    )
    res.status(200).send({ message: 'Images by Category', photos: newPhotos, pageCount })
})

const getImagesByCategoryType = asyncHandler(async(req, res) => {
    const { categoryName, pageNumber = 1, pageSize = 20 } = req.query

    const category = await Category.findOne({ name: categoryName})

    if(!category) return res.status(400).send({ message: 'Category not found with this title' })
    const photos = await ImageVault.find({ category: category._id, isActive: true }).populate('category photographer license ').skip((pageNumber - 1) * pageSize).limit(pageSize)

    if(!photos || photos.length === 0) return res.status(400).send({ message: 'Photos not found' })

    const totalDocuments = await ImageVault.countDocuments({ category: category._id, isActive: true })
    const pageCount = Math.ceil(totalDocuments/pageSize)


    const newPhotos = await Promise.all(
        photos.map( async (image) => {
            // const likeExist = await Like.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
            // const commentExist = await Comment.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
            const imageAnalytics = await ImageAnalytics.findOne({ image: image._id })
            return {
                ...image.toObject(),
                imageAnalytics,
                // hasLiked: !!likeExist,
                // hasCommented: !!commentExist,
            };
        })
    )

    res.status(200).send({ message: 'Images by Category', photos: newPhotos, pageCount})
})



const deleteAllResolutions = asyncHandler(async (images) => {
    const deletePromises = [];
  
    for (const [key, url] of Object.entries(images)) {
      if (url) {
      
        const fileKey = url.split(".amazonaws.com/")[1]; 
        if (fileKey) {
          const command = new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET, 
            Key: fileKey,
          });
  
          deletePromises.push(s3.send(command));
        }
      }
    }
  
    const results = await Promise.all(deletePromises);
  
    return
  })
  
  const deleteImagesFromVault = asyncHandler(async (req, res) => {
    const { id } = req.query

    const photo = await ImageVault.findOne({ _id: id })

    if(!photo) return res.status(400).send({ message: 'Photo not found' })

    if(photo.imageLinks) {
       deleteAllResolutions(photo.imageLinks)
    }
    await ImageVault.findOneAndDelete({ _id: id })
    await Photographer.findOneAndUpdate({_id: photo.photographer}, { $inc: { photosCount: -1 } })
    await ImageAnalytics.findOneAndDelete({ image: photo._id })

    res.status(200).send({ message: 'Image deleted' })
})

const approveImage = asyncHandler(async (req, res) => {
    
      const { status, rejectionReason, imageId } = req.body;
  
      if (!['approved', 'rejected', 'review'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Allowed values are "approved", "rejected", or "review".' });
      }
  
      const image = await ImageVault.findById(imageId);
      if (!image) {
        return res.status(404).json({ message: 'Image not found.' });
      }
  
      image.exclusiveLicenseStatus = status;
  
      if (status === 'rejected' && rejectionReason) {
        image.rejectionReason = rejectionReason || null
        image.isActive = false
      } else if (status === 'approved') {
        image.rejectionReason = null; 
        image.isActive = true
      } else if (status === 'review') {
        image.rejectionReason = null; 
        image.isActive = false
      }
  
      await image.save();
  
      res.status(200).json({
        message: `Image ${status} successfully.`,
        image,
      });
    
  })
  
const getAllPendingImagesForAdmin = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query

  
  const totalDocuments = await ImageVault.countDocuments({ exclusiveLicenseStatus: { $in: ['pending', 'review'] }, isActive: false })
  const pageCount = Math.ceil(totalDocuments/pageSize)

  const images = await ImageVault.find({ exclusiveLicenseStatus: { $in: ['pending', 'review'] }, isActive: false}).populate('category photographer license').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

  const newImages = await Promise.all(
      images.map(async (image) => {
          // const likeExist = await Like.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
          // const commentExist = await Comment.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
          const imageAnalytics = await ImageAnalytics.findOne({ image: image._id })
          return {
              ...image.toObject(),
              imageAnalytics,
              // hasLiked: !!likeExist,
              // hasCommented: !!commentExist,
          };
      })
  );
  
 
  res.status(200).send({ photos : newImages, pageCount })
  
})

const toggleFeaturedArtwork = asyncHandler(async (req, res) => {
  const { imageId } = req.query

  const image = await ImageVault.findById({ _id: imageId })

  image.featuredArtwork = !image.featuredArtwork

  await image.save()

  res.status(200).send({  message: 'Featured Artwork toggle successfully' })
})

const getFeaturedArtwork = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query

  const [ featuredArtwork, totalDocuments ] = await Promise.all([
    ImageVault.find({ featuredArtist: true }).sort({ createdAt: -1 }).skip((pageNumber -1) * pageSize).limit(pageSize),
    ImageVault.countDocuments({ featuredArtist: true })
  ])

  if(!featuredArtwork || featuredArtwork.length === 0) {
      return res.status(400).send({  message: 'Featured Artwork not found' })
  }
  const pageCount = Math.ceil(totalDocuments/pageSize)

  res.status(200).send({  featuredArtwork, pageCount })
})

module.exports = {
    addImageInVault,
    updateImageInVault,
    getImageFromVault,
    getAllImagesFromVault,
    deleteImagesFromVault,
    getAllImagesByPhotographer,
    getImagesByCategory,
    getImagesByCategoryType,
    approveImage,
    getAllPendingImagesForAdmin,
    toggleFeaturedArtwork,
    getFeaturedArtwork
}