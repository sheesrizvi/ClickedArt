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
const Order = require('../../models/orderModel.js')
const { generateSlug } = require('../../middleware/slugMiddleware.js')
const {  sendApprovedImageMail,
  sendUnapprovedImageMail, setApprovedImageOfMonetizedProfile,
  setApprovedImageOfNonMonetizedProfile, 
  sendUnapprovedImageMailOfMonetizedProfile,
  sendEventSubmissionConfirmation,
  sendUnapprovedImageMailOfNonMonetizedProfile } = require('../../middleware/handleEmail.js')

const Subscription = require('../../models/subscriptionModel.js')

const config = {
    region: process.env.AWS_BUCKET_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
  };
  
const s3 = new S3Client(config);

const addImageInVault = asyncHandler(async (req, res) => {
  const { category, photographer, imageLinks, resolutions, description, story, keywords, location, watermark, cameraDetails, price, license, title, notForSale, eventName, eventEndDate } = req.body

  if(!category || !photographer || !imageLinks ) return res.status(400).send({ message: 'Mandatory Fields are required' })
 

    if(category.length < 1 || category.length > 5) {
      return res.status(400).send({ message: 'You can select at least one & at max 5 categories' })
    }

    const subscription = await Subscription.findOne({
      'userInfo.user': photographer,
      'userInfo.userType': 'Photographer',
      isActive: true,
    }).populate('planId');
 
    let imageLimit;
      if (subscription?.planId?.name === 'Basic') {
        imageLimit = 10;
      } else if (subscription?.planId?.name === 'Intermediate') {
        imageLimit = 50;
      } else if (subscription?.planId?.name === 'Premium') {
        imageLimit = Infinity; 
      } else {
        imageLimit = 10; 
      }


    const uploadedImagesCount = await ImageVault.countDocuments({ photographer });
    
    if (uploadedImagesCount >= imageLimit) {
      return res.status(400).send({ message: `You have reached your upload limit of ${imageLimit} images for the ${subscription.planId.name} plan.` });
    }
    
  const royaltyShare = await RoyaltySettings.findOne({ licensingType: 'exclusive' })
  const sizePricingModifiers = royaltyShare.sizePricingModifiers;

  const prices = {}
  prices.original = price
  if(imageLinks.medium) {
    prices.medium = price * (1 + sizePricingModifiers.medium / 100); 
  }
  prices.small = price * (1 + sizePricingModifiers.small / 100);  

  const slug = generateSlug(title)

  const newImage = await ImageVault.create({
    category, photographer, imageLinks, resolutions, title, description, keywords, 
    location, 
    story,
    license,
    watermark, cameraDetails, price: prices,
    notForSale,
    slug,
    eventName, eventEndDate
  })

  await ImageAnalytics.create({
    image: newImage._id
  })

 
 await Photographer.findOneAndUpdate({_id: photographer}, { $inc: { photosCount: 1 } })
 res.status(201).send({ photo: newImage })
})


const updateImageInVault = asyncHandler(async (req, res) => {
    const { id, category, photographer, imageLinks, resolutions, title, description, story, keywords, location, watermark, cameraDetails, price, license, notForSale, eventName, eventEndDate } = req.body

    if(!category || !photographer || !imageLinks || !id ) return res.status(400).send({ message: 'Mandatory Fields are required' })

    if(category.length < 1 || category.length > 5) {
      return res.status(400).send({ message: 'You can select min 1 and max 5 categories' })
    }

    const photo = await ImageVault.findOne({ _id: id, photographer })
    if(!photo) return res.status(400).send({  message: 'Photo not found' })

    if(photo.title !== title || !photo.slug) {
      const slug = generateSlug(title)
      photo.slug = slug
    }
  
   photo.category = category || photo.category
   photo.resolutions = resolutions || photo.resolutions
   photo.description = description || photo.description
   photo.title = title || photo.title
   photo.keywords = keywords || photo.keywords
   photo.location = location || photo.location
   photo.watermark = watermark || photo.watermark
   photo.cameraDetails = cameraDetails || photo.cameraDetails
   photo.story = story || photo.story
   photo.license = license || photo.license
   photo.eventName = eventName || photo.eventName
   photo.eventEndDate = eventEndDate || photo.eventEndDate


   if (notForSale !== undefined) {
    photo.notForSale = notForSale;
  }

  //  const prices = {}
  //  if(price) {
  //   const royaltyShare = await RoyaltySettings.findOne({ licensingType: 'exclusive' })
  //   const sizePricingModifiers = royaltyShare.sizePricingModifiers;

  //   prices.original = price
  //   if(imageLinks.medium) {
  //     prices.medium = price * (1 + sizePricingModifiers.medium / 100); 
  //   }
  //   prices.small = price * (1 + sizePricingModifiers.small / 100);  
  
  //  }
  //  photo.price = prices || photo.price

  //  await photo.save()
  
  const prices = {};

  if (price !== undefined) {  
      if (price === 0) {
          prices.original = 0;
          prices.medium = 0;
          prices.small = 0;
      } else {
          const royaltyShare = await RoyaltySettings.findOne({ licensingType: 'exclusive' });
          const sizePricingModifiers = royaltyShare.sizePricingModifiers;
  
          prices.original = price;
          if (photo.imageLinks.medium) {
              prices.medium = price * (1 + sizePricingModifiers.medium / 100);
          }

          if(photo.imageLinks.small) {
            prices.small = price * (1 + sizePricingModifiers.small / 100);
          }
      }
  }
  
  photo.price = prices || photo.price;
  
  await photo.save();

   res.status(201).send({ photo })
})

const getImageFromVault = asyncHandler(async (req, res) => {
    const { id } = req.query

    let image = await ImageVault.findOne({ _id: id }).populate('photographer category license')

    if(!image) return res.status(400).send({ message: 'Image not found' })
    
    // const likeExist = await Like.findOne({ 'entityInfo.entity': id, 'userInfo.user': requesterId })
    // const commentExist = await Comment.findOne({ 'entityInfo.entity': id, 'userInfo.user': requesterId  })
    const imageAnalytics = await ImageAnalytics.findOne({ image: id })
    const imageObject = image.toObject()
    imageObject.imageLinks = { thumbnail: imageObject.imageLinks?.thumbnail || null };

    image = {
        ...imageObject,
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
            const imageObject = image.toObject();
            imageObject.imageLinks = { thumbnail: imageObject.imageLinks?.thumbnail || null };
            
            return {
                ...imageObject,
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
            const imageObject = image.toObject();
            imageObject.imageLinks = { thumbnail: imageObject.imageLinks?.thumbnail || null };

            return {
                ...imageObject,
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
            const imageObject = image.toObject();
            imageObject.imageLinks = { thumbnail: imageObject.imageLinks?.thumbnail || null };

            return {
                ...imageObject,
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
            // const imageObject = image.toObject();
            // imageObject.imageLinks = { thumbnail: imageObject.imageLinks?.thumbnail || null };

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
    await ImageVault.findOneAndUpdate({ _id: id }, { $set: { isActive: false } })
    // await Photographer.findOneAndUpdate({_id: photo.photographer}, { $inc: { photosCount: -1 } })
    // await ImageAnalytics.findOneAndDelete({ image: photo._id })

    res.status(200).send({ message: 'Image deleted' })
})

const approveImage = asyncHandler(async (req, res) => {
    
      const { status, rejectionReason, imageId } = req.body;
  
      if (!['approved', 'rejected', 'review'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Allowed values are "approved", "rejected", or "review".' });
      }
  
      const image = await ImageVault.findById(imageId).populate('photographer');
      if (!image || !image.photographer) {
        return res.status(404).json({ message: 'Image not found.' });
      }
  
    
  
      if (status === 'rejected' && rejectionReason) {
        image.rejectionReason = rejectionReason || null
        image.isActive = false
        const imageTitle = image.title
        image.exclusiveLicenseStatus = status
        const photographerName = `${image.photographer.firstName} ${image.photographer.lastName}`
        const email = image.photographer.email
        const reasons = image.rejectionReason
        const isMonetized = image.photographer.isMonetized
        if(!image.eventName || image.eventName === '') {
          if(isMonetized) {
            sendUnapprovedImageMailOfMonetizedProfile(photographerName, email, imageTitle, reasons)
          } else {
            sendUnapprovedImageMailOfNonMonetizedProfile(photographerName, email, imageTitle,  reasons)
          }
        }
      } else if (status === 'approved') {
        const photographerName = `${image.photographer.firstName} ${image.photographer.lastName}`
        const isMonetized = image.photographer.isMonetized
        const email = image.photographer.email
        const imageTitle = image.title
        image.rejectionReason = null; 
        image.isActive = true
        image.exclusiveLicenseStatus = status
        if(image.eventName && image.eventName !== '') {
          // sendEventSubmissionConfirmation(photographerName, email, imageTitle)
        } else if(isMonetized) {
          setApprovedImageOfMonetizedProfile(photographerName, email, imageTitle)
        } else {
          setApprovedImageOfNonMonetizedProfile(photographerName, email, imageTitle)
        }
        

      } else if (status === 'review') {
        image.rejectionReason = null; 
        image.isActive = false
        image.exclusiveLicenseStatus = status
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

  const images = await ImageVault.find({ exclusiveLicenseStatus : { $in: ['pending', 'review'] }, isActive: false}).populate('category photographer license').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

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
  const { imageId } = req.body

  const image = await ImageVault.findOne({ _id: imageId })

  if(!image) {
    throw new Error('Image not found')
  }

  image.featuredArtwork = !image.featuredArtwork

  await image.save()

  res.status(200).send({  message: 'Featured Artwork toggle successfully' })
})

const getFeaturedArtwork = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query

  const [ featuredArtwork, totalDocuments ] = await Promise.all([
    ImageVault.find({ featuredArtwork: true, isActive: true }).populate('category photographer license').sort({ createdAt: -1 }).skip((pageNumber -1) * pageSize).limit(pageSize),
    ImageVault.countDocuments({ featuredArtwork : true, isActive: true })
  ])

  if(!featuredArtwork || featuredArtwork.length === 0) {
      return res.status(400).send({  message: 'Featured Artwork not found' })
  }
  const pageCount = Math.ceil(totalDocuments/pageSize)
  
  const newPhotos = await Promise.all(
    featuredArtwork.map((image) => {
      const imageObject = image.toObject()
      imageObject.imageLinks = { thumbnail: imageObject.imageLinks?.thumbnail || null };

      return {
        ...imageObject
      }
    })
  )
 

  res.status(200).send({  featuredArtwork: newPhotos, pageCount })
})

// const searchImages = asyncHandler(async (req, res) => {
//   let { Query, pageNumber = 1, pageSize = 20 } = req.query;
//   if(!Query) {
//     return res.status(400).send({ message: 'Query is required' })
//   }
//   pageSize = parseInt(pageNumber, 10)
//   pageNumber = parseInt(pageSize, 20)
//   // const pipeline = [
//   //   {
//   //     $search: {
//   //       index: 'default',
//   //       text: {
//   //         query: searchQuery,
//   //         path: ['title', 'description', 'story', 'keywords'],
//   //         fuzzy: { maxEdits: 2, prefixLength: 2 }
//   //       }
//   //     }
//   //   },
//   // ]
  
//   const pipeline = [
//     {
//       $search: {
//         index: "imagesearchindex",
//         compound: {
//           should: [
//             {
//               text: {
//                 query: Query,
//                 path: "title",
//                 fuzzy: { maxEdits: 2, prefixLength: 2  }
//               }
//             },
//             {
//               text: {
//                 query: Query,
//                 path: "description",
//                 fuzzy: { maxEdits: 2, prefixLength: 2  }
//               }
//             },
//             {
//               text: {
//                 query: Query,
//                 path: "story",
//                 fuzzy: { maxEdits: 2, prefixLength: 2  }
//               }
//             },
//             {
//               text: {
//                 query: Query,
//                 path: "keywords",
//                 fuzzy: { maxEdits: 2, prefixLength: 2  }
//               }
//             }
//           ]
//         }
//       }
//     },
//     { $match: { isActive: true } },
   
//     // {$addFields: {score: {$meta: "searchScore"}}},
//     // {$setWindowFields: {output: {maxScore: {$max: "$score"}}}},
//     // {$addFields: {normalizedScore: {$divide: ["$score", "$maxScore"]}}},
//     // {$match: {normalizedScore: {$gte: 0.9}}},
//     // {$sort: {normalizedScore: -1}},
//     {
//       $addFields: {
//         relevanceScore: { $meta: "searchScore" },
//       },
//     },
//     {
//       $match: {
//         relevanceScore: { $gte: 0.6 }, 
//       },
//     },
//     { $skip: (pageNumber - 1) * pageSize },
//     { $limit: pageSize },
//   ];

//   const totalPipeline = [
//     {
//       $search: {
//         index: "imagesearchindex",
//         compound: {
//           should: [
//             {
//               text: {
//                 query: Query,
//                 path: "title",
//                 fuzzy: { maxEdits: 2, prefixLength: 2 }
//               }
//             },
//             {
//               text: {
//                 query: Query,
//                 path: "description",
//                 fuzzy: { maxEdits: 2, prefixLength: 2 }
//               }
//             },
//             {
//               text: {
//                 query: Query,
//                 path: "story",
//                 fuzzy: { maxEdits: 2, prefixLength: 2 }
//               }
//             },
//             {
//               text: {
//                 query: Query,
//                 path: "keywords",
//                 fuzzy: { maxEdits: 2 }
//               }
//             }
//           ]
//         }
//       }
//     },
//     {
//       $addFields: {
//         relevanceScore: { $meta: "searchScore" },
//       },
//     },
//     {
//       $match: {
//         relevanceScore: { $gte: 0.6 }, 
//       },
//     },
//     { $match: { isActive: true } },
//     { $count: "total" }
//   ];

//   let results = await ImageVault.aggregate(pipeline);
//   const totalDocuments = await ImageVault.aggregate(totalPipeline);
  
//   let count = totalDocuments.length > 0 && totalDocuments[0]?.total > 0 ? totalDocuments[0]?.total : 0;
//   // const pageCount = Math.ceil(count / pageSize);

//   const imageIds = results.map((result) => result._id)
  
//   results = await ImageVault.find({ _id: { $in: imageIds } }).populate('category photographer license')


//   const categories = await Category.find({ $or: [
//     { name: { $regex: Query, $options: 'i' } },
//     { description: { $regex: Query, $options: 'i' } }
//   ] })
  
//   const categoriesIds = categories.map((category) => category._id)
  
//   const categoryImageResults = await ImageVault.find({ 
//       category: { $in: categoriesIds },
//       isActive: true
//    }).populate('category photographer license').skip((pageNumber - 1) * pageSize).limit(pageSize)

//    const totalCategoryDocuments = await ImageVault.countDocuments({
//       category: { $in: categoriesIds },
//       isActive: true
//    })
//    console.log(totalCategoryDocuments, count)
//    results = [...results, ...categoryImageResults]
 
//    console.log(results.length)
//    const uniqueResults = Array.from(
//     new Map(results.map(item => [item._id.toString(), item])).values()
//   );
//    count = uniqueResults.length
//    const pageCount = Math.ceil(count / pageSize);


//   res.status(200).send({ results: uniqueResults, pageCount });
// });

// const searchImages = asyncHandler(async (req, res) => {
//   let { Query, pageNumber = 1, pageSize = 20, sortType='date_popularity', order='desc' } = req.query;

//   if (!Query) {
//     return res.status(400).send({ message: 'Query is required' });
//   }

//   pageNumber = parseInt(pageNumber, 10);
//   pageSize = parseInt(pageSize, 10);

//   const searchPipeline = [
//     {
//       $search: {
//         index: 'imagesearchindex',
//         compound: {
//           should: ['title', 'description', 'story', 'keywords'].map((field) => ({
//             text: {
//               query: Query,
//               path: field,
//               fuzzy: { maxEdits: 2, prefixLength: 2 }
//             }
//           }))
//         }
//       }
//     },
//     { $match: { isActive: true } },
//     { $addFields: { relevanceScore: { $meta: 'searchScore' } } },
//     { $match: { relevanceScore: { $gte: 0.6 } } },
//     { $sort: { relevanceScore: -1 } },
//     { $skip: (pageNumber - 1) * pageSize },
//     { $limit: pageSize }
//   ];

//   const countPipeline = [
//     ...searchPipeline.slice(0, -2),
//     { $count: 'total' }
//   ];

//   let results = await ImageVault.aggregate(searchPipeline);
//   const totalDocs = await ImageVault.aggregate(countPipeline);
//   let count = totalDocs.length > 0 ? totalDocs[0].total : 0;

//   const imageIds = results.map((result) => result._id);
//   results = await ImageVault.find({ _id: { $in: imageIds } }).populate('category photographer license');

//   const categories = await Category.find({
//     $or: [
//       { name: { $regex: Query, $options: 'i' } },
//       { description: { $regex: Query, $options: 'i' } }
//     ]
//   });

//   const categoryImageResults = await ImageVault.find({
//     category: { $in: categories.map((c) => c._id) },
//     isActive: true
//   }).populate('category photographer license').skip((pageNumber - 1) * pageSize).limit(pageSize);

//   results = [...results, ...categoryImageResults];
//   results = Array.from(new Map(results.map(item => [item._id.toString(), item])).values());

//   count = results.length;
//   const pageCount = Math.ceil(count / pageSize);

//   res.status(200).send({ results, pageCount });
// });


const searchImages = asyncHandler(async (req, res) => {
  let { pageNumber = 1, pageSize = 20, sortType = 'date_popularity', order = 'desc', Query = '' } = req.query;
  const searchQuery = Query
  
  pageNumber = parseInt(pageNumber)
  pageSize = parseInt(pageSize)

  const [{ totalDocuments = 0 } = {}] = await ImageVault.aggregate([
    {
      $search: {
        index: 'imagesearchindex',
        compound: {
          should: ['title', 'description', 'story', 'keywords'].map((field) => ({
            text: {
              query: searchQuery,
              path: field,
              fuzzy: { maxEdits: 2, prefixLength: 2 },
            },
          })),
        },
      },
    },
    { $match: { isActive: true } },
    { $addFields: { relevanceScore: { $meta: 'searchScore' } } },
    { $match: { relevanceScore: { $gte: 1 } } },
    { $count: 'totalDocuments' },
  ]);

  const pageCount = Math.ceil(totalDocuments / pageSize);

  let sortOrder = order === 'asc' ? 1 : -1;
  let sortCriteria = { createdAt: -1, 'imageAnalytics.views': -1, 'imageAnalytics.downloads': -1 };

  if (sortType === 'date') {
    sortCriteria = { createdAt: sortOrder };
  } else if (sortType === 'price') {
    sortCriteria = { 'price.original': sortOrder };
  } else if (sortType === 'views') {
    sortCriteria = { 'imageAnalytics.views': sortOrder };
  } else if (sortType === 'likes') {
    sortCriteria = { 'imageAnalytics.likes': sortOrder };
  } else if (sortType === 'downloads') {
    sortCriteria = { 'imageAnalytics.downloads': sortOrder };
  }

  const searchPipeline = [
    {
      $search: {
        index: 'imagesearchindex',
        compound: {
          should: ['title', 'description', 'story', 'keywords'].map((field) => ({
            text: {
              query: searchQuery,
              path: field,
              fuzzy: { maxEdits: 2, prefixLength: 2 },
            },
          })),
        },
      },
    },
    { $match: { isActive: true } },
    { $addFields: { relevanceScore: { $meta: 'searchScore' } } },
    { $match: { relevanceScore: { $gte: 1 } } },
    { $sort: { relevanceScore: -1 } },
    { $skip: (pageNumber - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    {
      $lookup: {
        from: 'imageanalytics',
        localField: '_id',
        foreignField: 'image',
        as: 'imageAnalytics',
      },
    },
    {
      $unwind: { path: '$imageAnalytics', preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: 'photographers', 
        localField: 'photographer',
        foreignField: '_id',
        as: 'photographer'
      }
    },
    { $unwind: { path: '$photographer', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'categories', 
        localField: 'category',
        foreignField: '_id',
        as: 'category'
      }
    },
    { $sort: sortCriteria },
  ];



  let images = await ImageVault.aggregate(searchPipeline);
  images = await Promise.all(
    images.map((async (image) => {
      const imageObject = image;
      imageObject.imageLinks = { thumbnail: imageObject.imageLinks?.thumbnail || null };

      return {
        ...imageObject
      }
    }))
  )
  const sortedImages = images.sort((a, b) => b.relevanceScore - a.relevanceScore).map(image => image);


  res.status(200).send({ photos: sortedImages, pageCount });
});



const updateImageViewCount = asyncHandler(async (req, res) => {
  const { imageId } = req.body
  if(!imageId){
    return res.status(400).send({ message: 'No image found to update' })
  }
  const analytics = await ImageAnalytics.findOneAndUpdate({
    image: imageId
  }, { 
      $inc: { views: 1 }
   },
   { new: true, upsert: true } 
  ).populate({
    path: 'image',
    populate: [
      {
        path: 'category'
      },
      {
        path: 'photographer'
      },
      {
        path: 'license'
      }
    ]
  })

   if(!analytics) {
    return res.status(400).send({ message: 'Not able to update' })
   }
   res.status(200).send({ message: 'View Count Updated Successfully' })
})

const getImageAnalytics = asyncHandler(async (req, res) => {
  const { imageId } = req.query
  const downloads = await Order.countDocuments({ 'imageInfo.image': imageId })

  const imageAnalytics = await ImageAnalytics.findOneAndUpdate({ image: imageId }, {
    downloads
  }).populate({
    path: 'image',
    select: 'imageLinks.thumbnail resolutions title description story keywords category photographer license price location cameraDetails featuredArtwork notForSale slug',
    populate: [
      {
        path: 'category'
      },
      {
        path: 'photographer'
      },
      {
        path: 'license'
      }
    ]
  })

 if(!imageAnalytics){
  return res.status(400).send({ message: 'No Image Analytics Found' })
 }

 const salesCount = await Order.aggregate([
  { $match: { orderStatus: 'completed', isPaid: true } }, 
  { $unwind: "$orderItems" }, 
  { $match: { "orderItems.imageInfo.image": new mongoose.Types.ObjectId(imageId) } }, 
  { $count: "totalSales" }
]);

const totalSales = salesCount[0]?.totalSales || 0; 
const totalViews = imageAnalytics.views; 

const conversionRate = totalViews ? Math.min((totalSales / totalViews) * 100, 100) : 0;
 
const imageAnalyticsData = {
  ...imageAnalytics.toObject(),
  conversionRate
}
 res.status(200).send({ message: 'Image Analytics' , imageAnalytics: imageAnalyticsData })
})

const bestSellerPhotos = asyncHandler(async (req, res) => {

  const bestSellers = await Order.aggregate([
    {
      $unwind: '$orderItems',
    },
    {
      $group: {
        _id: '$orderItems.imageInfo.image',
        downloadCount: { $sum: 1 },
      },
    },
    {
      $sort: { downloadCount: -1 },
    },
    {
      $limit: 10,
    },
    {
      $lookup: {
        from: 'imagevaults',
        localField: '_id',
        foreignField: '_id',
        as: 'imageDetails',
      },
    },
    {
      $unwind: '$imageDetails',
    },
    {
      $match: {
        'imageDetails.isActive': true,
      },
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'imageDetails.category',
        foreignField: '_id',
        as: 'categoryDetails',
      },
    },
    {
      $lookup: {
        from: 'photographers',
        localField: 'imageDetails.photographer',
        foreignField: '_id',
        as: 'photographerDetails',
      },
    },
    {
      $lookup: {
        from: 'licenses',
        localField: 'imageDetails.license',
        foreignField: '_id',
        as: 'licenseDetails',
      },
    },
    {
      $project: {
        _id: 0,
        image: '$imageDetails',
        downloadCount: 1,
        categoryDetails: { $arrayElemAt: ['$categoryDetails', 0] },
        photographerDetails: { $arrayElemAt: ['$photographerDetails', 0] },
        licenseDetails: { $arrayElemAt: ['$licenseDetails', 0] },
      },
    },
  ]);

  const images = await Promise.all(
    bestSellers.map(async (image) => {
      const imageObject = image;
      imageObject.imageLinks = { thumbnail: imageObject.imageLinks?.thumbnail || null };
      return {
        ...imageObject
      }
    })
  )
  
  res.status(200).send({ bestSellers: images })
  
}) // Not Tested


const getRejectedImages = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query

  
  const totalDocuments = await ImageVault.countDocuments({ exclusiveLicenseStatus: { $in: ['rejected'] }, isActive: false })
  const pageCount = Math.ceil(totalDocuments/pageSize)

  const images = await ImageVault.find({ exclusiveLicenseStatus : { $in: ['rejected'] }, isActive: false}).populate('category photographer license').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

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

const getAllImagesFromVaultBySorting = asyncHandler(async (req, res) => {
  let { pageNumber = 1, pageSize = 20, sortType='date_popularity', order='desc' } = req.query

  pageNumber = parseInt(pageNumber)
  pageSize = parseInt(pageSize)

  const totalDocuments = await ImageVault.countDocuments({ isActive: true })
  const pageCount = Math.ceil(totalDocuments/pageSize)

  let sortCriteria = { createdAt: -1, 'imageAnalytics.views': -1, 'imageAnalytics.downloads': -1 }
  let sortOrder = order === 'asc' ? 1 : -1
  
  if(sortType === 'date') {
    sortCriteria = { createdAt: sortOrder }
  } else if(sortType === 'price') {
    sortCriteria = { 'price.original': sortOrder }
  } else if (sortType === 'views') {
    sortCriteria = { 'imageAnalytics.views': sortOrder }
  } else if (sortType === 'likes') {
    sortCriteria = { 'imageAnalytics.likes': sortOrder }
  } else if (sortType === 'downloads') {
    sortCriteria = { 'imageAnalytics.downloads': sortOrder }
  }

  const matchStage = { isActive: true };

  if (sortType === 'price' && order === 'asc') {
    matchStage.notForSale = { $ne: true };
  }

  let images = await ImageVault.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'imageanalytics',
        localField: '_id',
        foreignField: 'image',
        as: 'imageAnalytics'
      }
    },
    {
      $unwind: { path: '$imageAnalytics', preserveNullAndEmptyArrays: true }
    },
    {
      $lookup: {
        from: 'photographers', 
        localField: 'photographer',
        foreignField: '_id',
        as: 'photographer'
      }
    },
    { $unwind: { path: '$photographer', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'categories', 
        localField: 'category',
        foreignField: '_id',
        as: 'category'
      }
    },

    {
      $sort: sortCriteria
    },
    {
      $skip: (pageNumber - 1) * pageSize
    },
    {
      $limit: pageSize
    }
  ])



 images = await Promise.all(
    images.map(async (image) => {
      const imageObject = image;
      imageObject.imageLinks = { thumbnail: imageObject.imageLinks?.thumbnail || null };
      return {
        ...imageObject
      }
    })
  )
  

 res.status(200).send({ photos: images, pageCount })
 
  // const newImages = await Promise.all(
  //     images.map(async (image) => {
  //         // const likeExist = await Like.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
  //         // const commentExist = await Comment.findOne({ 'entityInfo.entity': image._id, 'userInfo.user': requesterId });
  //         const imageAnalytics = await ImageAnalytics.findOne({ image: image._id })

  //         return {
  //             ...image.toObject(),
  //             imageAnalytics,
  //             // hasLiked: !!likeExist,
  //             // hasCommented: !!commentExist,
  //         };
  //     })
  // );
  
 
   //res.status(200).send({ photos : newImages, pageCount })
})


const updateNotForSaleStatus = asyncHandler(async (req, res) => {
  const { imageId, status = false } = req.body
  
  await ImageVault.findOneAndUpdate({ _id: imageId }, { notForSale: status })

  res.status(200).send({ message: 'Image not for sale status updated successfuly' })
})


const getImageBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.query

  if(!slug) {
    return res.status(400).send({ message: 'Slug is required' })
  }

  let image = await ImageVault.findOne({ slug: { $regex: new RegExp(`^${slug}$`, 'i') }  }).populate('category license').populate({
    path: 'photographer',
    select: '-bestPhotos'
  })

  if(!image) {
    return res.status(400).send({ message: 'No Image found' })
  }
  
  const imageObject = image.toObject()
  imageObject.imageLinks = { thumbnail: imageObject.imageLinks?.thumbnail || null };
  image = {
    ...imageObject,
  }

  res.status(200).send({ image })
})

const getImageForDownload = asyncHandler(async (req, res) => {
    let { id, resolution } = req.query
    
    let image = await ImageVault.findOne({ _id: id }).select('imageLinks photographer resolutions title description story keywords category photographer license price location cameraDetails slug').populate('photographer category license')
    
    let imageUrl = image.imageLinks[resolution]; 

    if (!imageUrl) return res.status(400).send({ message: 'Requested resolution not available' });

    res.status(200).send({ photo: { ...image.toObject(), imageLinks: { [resolution]: imageUrl } } });

})

const getImagesOfEventsByPhotographer = asyncHandler(async (req, res) => {
    const { photographerId, eventName } = req.query

    const images = await ImageVault.find({ photographer: photographerId, eventName: eventName.toLowerCase() })

    if(!images || images.length === 0) {
      throw new Error('Images not found')
    }

    res.status(200).send({ images })
})

const getImagesByEvents= asyncHandler(async (req, res) => {
 const { eventName } = req.query
    
    const images = await ImageVault.find({ eventName: eventName.toLowerCase() })

    if(!images || images.length === 0) {
      throw new Error('Images not found')
    }

    res.status(200).send({ images })
})

const getPhotographerByEvents = asyncHandler(async (req, res) => {
  const { eventName, pageNumber = 1, limit = 20 } = req.query;

  const lowerCaseEvent = eventName.toLowerCase();
  const skip = (parseInt(pageNumber) - 1) * parseInt(limit);

  const totalImages = await ImageVault.countDocuments({ eventName: lowerCaseEvent });

  const images = await ImageVault.find({ eventName: lowerCaseEvent })
    .populate('photographer')
    .skip(skip)
    .limit(parseInt(limit));

  const photographerMap = new Map();
  images.forEach((img) => {
    if (img.photographer && !photographerMap.has(img.photographer._id.toString())) {
      photographerMap.set(img.photographer._id.toString(), img.photographer);
    }
  });

  const photographers = Array.from(photographerMap.values());

  res.send({
    photographers,
    pageCount: Math.ceil(totalImages / parseInt(limit))
  });
});


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
    getFeaturedArtwork,
    searchImages,
    updateImageViewCount,
    getImageAnalytics,
    bestSellerPhotos,
    getRejectedImages,
    getAllImagesFromVaultBySorting,
    updateNotForSaleStatus,
    getImageBySlug,
    getImageForDownload,
    getImagesByEvents,
    getImagesOfEventsByPhotographer,
    getPhotographerByEvents
  }
