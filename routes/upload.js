const path = require("path");
const express = require("express");
const router = express.Router();
const { Upload } = require("@aws-sdk/lib-storage");
const sharp = require("sharp");
const multer = require("multer");
const multerS3 = require("multer-s3");
const asyncHandler = require('express-async-handler')
const { S3Client } = require("@aws-sdk/client-s3");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs')
const axios = require('axios')
const RoyaltySettings = require('../models/imagebase/royaltyModel.js')
const CustomWatermark = require('../models/imagebase/customWatermarkModel.js')
const { S3 } = require("@aws-sdk/client-s3");
const sizeOf = require('image-size');




const config = {
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
};

const s3 = new S3Client(config);


const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
      cb(null, `${fileName}${path.extname(file.originalname)}`);
    },
  }),
});


const upload1 = multer({
  storage: multer.memoryStorage(),
});


// router.post(
//   "/uploadSingleImage",
//   upload.single("image"),
//   async (req, res) => {
//     const result = req.file;
    
//     if (!result) {
//       return res.status(400).send("No file uploaded.");
//     }
  
//     res.send(`${result.location}`);
//   }
// );

const multerStorage = multer.memoryStorage();
const uploadMulter = multer({ storage: multerStorage });

router.post("/uploadSingleImage", uploadMulter.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  console.log('running')
  try {

    // const compressedBuffer = await sharp(req.file.buffer)
    //   .resize({ fit: "inside", withoutEnlargement: true }) 
    //   .webp({  
    //     quality: 5, 
    //     effort: 6, 
    //     nearLossless: false,
    //     smartSubsample: true,
    //     lossless: false,
    //     alphaQuality: 50
    //    }) 
    //   .toBuffer();
    
    const compressedBuffer = await compressToExactSize(req.file.buffer)

    const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}.webp`;

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET,
      Key: fileName,
      Body: compressedBuffer,
      ContentType: "image/webp"
    };

    const uploadCommand = new PutObjectCommand(uploadParams);
    await s3.send(uploadCommand);
    process.env.AWS_BUCKET_REGION
    const fileUrl = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${fileName}`;
    res.send(fileUrl);

  } catch (error) {
    console.error("Error processing/uploading image:", error);
    res.status(500).send("Error processing/uploading image.");
  }
});

router.post(
  "/uploadMultiple",
  upload.array("image", 150),
  async (req, res) => {
    const result = req.files;

    if (!result || result.length === 0) {
      return res.status(400).send("No files uploaded.");
    }

    let arr = [];
    result.forEach((single) => {
      arr.push(single.location);
    });

   
    res.send(arr);
  }
);



router.post("/uploadPhotoForMultipleResolution", upload1.single("image"), async (req, res) => {
  try {
    const result = req.file;
    
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const originalImageBuffer = req.file.buffer;

    const resolutions = {
      original: null, 
      large: { width: 1920, height: 1280 }, 
      medium: { width: 1280, height: 853 }, 
      small: { width: 640, height: 427 },
      standard: { width: 1920, height: 1080 }, 
      fullscreen: { width: 2560, height: 1440 }, 
      ultraHD: { width: 3840, height: 2160 }, 
    };

    const uploadPromises = Object.entries(resolutions).map(async ([key, size]) => {
      const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${result.originalname}`;
      const fileKey = `images/${fileName}`;
    
      let processedBuffer;
      if (size) {
        processedBuffer = await sharp(originalImageBuffer)
          .resize(size.width, size.height)
          .toBuffer();
      } else {
        processedBuffer = originalImageBuffer;
      }

      const upload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.AWS_BUCKET,
          Key: fileKey,
          Body: processedBuffer,
          ContentType: req.file.mimetype,
        },
      });

      await upload.done();
      
      return { key, url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}` };
    });

   
    const uploadResults = await Promise.all(uploadPromises);

    const urls = uploadResults.reduce((acc, { key, url }) => {
      acc[key] = url;
      return acc;
    }, {});

    res.send(urls);
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).send("Failed to upload image.");
  }
});





// @ primary route in our case for converting images into multiple resolution
router.post(
  "/uploadPhotoWithSizeCheck",
  upload1.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded.");
      }
      req.body.photographerId = '123',
      req.body.watermarkOptions = 'custom'

      
      const originalImageBuffer = req.file.buffer;
      const { width, height, format } = await sharp(originalImageBuffer).metadata();
      const fileSizeInMB = req.file.size / (1024 * 1024);
      console.log(fileSizeInMB);

      const sizeTargets = {
        small: 2.6 * 1024 * 1024, // 2.6 MB
        medium: 8.8 * 1024 * 1024, // 8.8 MB
      };

      const resolutions = {
        small: {
          width: Math.round(width * 0.6),  
          height: Math.round(height * 0.6),
        },
        medium: {
          width: Math.round(width * 0.75), 
          height: Math.round(height * 0.75),
        },
      };

      const convertToTargetSizeAndResolution = async (buffer, targetSize, targetResolution, format) => {
        let processedBuffer = buffer;


        processedBuffer = await sharp(buffer)
          .resize(targetResolution.width, targetResolution.height)
          .toBuffer(); 

 
        if (format === "jpeg" || format === "jpg") {
          let quality = 90;
          while (true) {
            processedBuffer = await sharp(processedBuffer) 
              .jpeg({ quality })
              .toBuffer();

            if (processedBuffer.length <= targetSize || quality <= 10) {
              break;
            }
            quality -= 5; 
          }
        } else if (format === "png") {
         
          processedBuffer = await sharp(processedBuffer) 
            .png({ compressionLevel: 9, quality: 100 }) 
            .toBuffer();
        } else if (format === "webp") {
          let quality = 90;
          while (true) {
            processedBuffer = await sharp(processedBuffer) 
              .webp({ quality })
              .toBuffer();

            if (processedBuffer.length <= targetSize || quality <= 10) {
              break;
            }
            quality -= 5; 
          }
        } else {
         
          processedBuffer = await sharp(processedBuffer) 
            .jpeg({ quality: 85 }) 
            .toBuffer();
        }

        return processedBuffer;
      };

      const conversionTargets =
        fileSizeInMB > 10
          ? ["small", "medium"]
          : fileSizeInMB > 4
          ? ["small"]
          : [];

      const uploadPromises = ["original", ...conversionTargets].map(async (key) => {
        const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${req.file.originalname}`;
        const fileKey = `images/${fileName}`;

        let processedBuffer;
        if (key === "original") {
          processedBuffer = originalImageBuffer;
        } else {
          const targetResolution = resolutions[key];
          const targetSize = sizeTargets[key];
          processedBuffer = await convertToTargetSizeAndResolution(
            originalImageBuffer,
            targetSize,
            targetResolution,
            format
          );
        }

        const upload = new Upload({
          client: s3,
          params: {
            Bucket: process.env.AWS_BUCKET,
            Key: fileKey,
            Body: processedBuffer,
            ContentType: req.file.mimetype,
          },
        });

        await upload.done();

        return { key, url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}` };
      });

      const uploadResults = await Promise.all(uploadPromises);


      const urls = uploadResults.reduce((acc, { key, url }) => {
        acc[key] = url;
        return acc;
      }, {});

      const returnedResolutions = { original: { width, height } };
      if (fileSizeInMB > 10) {
        returnedResolutions.medium = resolutions.medium;
        returnedResolutions.small = resolutions.small;
      } else if (fileSizeInMB > 4) {
        returnedResolutions.small = resolutions.small;
      }


      res.send({ urls, resolutions: returnedResolutions });
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).send("Failed to upload image.");
    }
  }
);




router.delete("/deleteImage", async (req, res) => {
  try {
    let image = req.query.image;

    image = Array.isArray(image) ? image : [image];

    const deletePromises = image.map(async (file) => {
      const fileKey = file.split(".amazonaws.com/")[1]; 

      if (!fileKey) {
        throw new Error("Invalid file URL provided");
      }

      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: fileKey,
      });

      return s3.send(command);
    });

    const responses = await Promise.all(deletePromises);

    res.status(200).send({ message: "Images deleted successfully", responses });
  } catch (error) {

    console.error("Error deleting images:", error);
    res.status(500).send({ message: "Failed to delete images", error });
  }
});


router.delete('/delete-all-resolutions', asyncHandler(async (req, res) => {
  const { images } = req.query
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

  console.log("Deleted images:", results);
  return { message: "Images deleted successfully", results };

}))


router.post(
  "/handle-photos-with-watermark-and-resolutions",
  upload1.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send("No file uploaded.");
      }

      const watermarkType = req.body.watermarkType;
      
      let watermarkBuffer;

      if (watermarkType === "Basic") {
        const royaltySettings = await RoyaltySettings.findOne();
        if (!royaltySettings || !royaltySettings.watermarkImage) {
          return res.status(400).send("Watermark image not found for Basic.");
        }
        const watermarkUrl = royaltySettings.watermarkImage;
        const watermarkResponse = await axios.get(watermarkUrl, { responseType: "arraybuffer" });
        watermarkBuffer = Buffer.from(watermarkResponse.data);
      } else if (watermarkType === "Custom") {

        const customWatermark = await CustomWatermark.findOne({ photographer: req.body.photographer }); 
        
        if (!customWatermark || !customWatermark.watermarkImage) {
          return res.status(400).send("Custom watermark image not found.");
        }
        const watermarkUrl = customWatermark.watermarkImage;
        const watermarkResponse = await axios.get(watermarkUrl, { responseType: "arraybuffer" });
        watermarkBuffer = Buffer.from(watermarkResponse.data);
      } else {
        return res.status(400).send("Invalid watermark type.");
      }

      const originalImageBuffer = req.file.buffer;
      const { width, height, format } = await sharp(originalImageBuffer).metadata();
      const fileSizeInMB = req.file.size / (1024 * 1024);

      const sizeTargets = {
        small: 2.6 * 1024 * 1024, // 2.6 MB
        medium: 8.8 * 1024 * 1024, // 8.8 MB
      };

      const resolutions = {
        small: {
          width: Math.round(width * 0.6),
          height: Math.round(height * 0.6),
        },
        medium: {
          width: Math.round(width * 0.75),
          height: Math.round(height * 0.75),
        },
      };

      const addWatermark = async (buffer, width, height) => {
        if (!watermarkBuffer) {
          return buffer; 
        }

        const watermarkWidth = Math.round(width * 0.05);
        const watermarkHeight = Math.round(height * 0.05);

        const watermarkResized = await sharp(watermarkBuffer)
          .resize(watermarkWidth, watermarkHeight, { fit: "inside" })
          .toBuffer();

        return sharp(buffer)
          .composite([
            {
              input: watermarkResized,
              gravity: "southeast",
              blend: "over",
              tile: false,
            },
          ])
          .toBuffer();
      };

      const convertToTargetSizeAndResolution = async (buffer, targetSize, targetResolution, format) => {
        let processedBuffer = await addWatermark(buffer, width, height);

        processedBuffer = await sharp(processedBuffer)
          .resize(targetResolution.width, targetResolution.height)
          .toBuffer();

        if (format === "jpeg" || format === "jpg") {
          let quality = 90;
          while (true) {
            processedBuffer = await sharp(processedBuffer)
              .jpeg({ quality })
              .toBuffer();

            if (processedBuffer.length <= targetSize || quality <= 10) {
              break;
            }
            quality -= 5;
          }
        } else if (format === "png") {
          processedBuffer = await sharp(processedBuffer)
            .png({ compressionLevel: 9, quality: 100 })
            .toBuffer();
        } else if (format === "webp") {
          let quality = 90;
          while (true) {
            processedBuffer = await sharp(processedBuffer)
              .webp({ quality })
              .toBuffer();

            if (processedBuffer.length <= targetSize || quality <= 10) {
              break;
            }
            quality -= 5;
          }
        } else {
          processedBuffer = await sharp(processedBuffer)
            .jpeg({ quality: 85 })
            .toBuffer();
        }

        return processedBuffer;
      };

      const conversionTargets =
        fileSizeInMB > 10
          ? ["small", "medium"]
          : fileSizeInMB > 4
          ? ["small"]
          : [];

      const uploadPromises = ["original", ...conversionTargets].map(async (key) => {
        const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${req.file.originalname}`;
        const fileKey = `images/${fileName}`;

        let processedBuffer;
        if (key === "original") {
          processedBuffer = await addWatermark(originalImageBuffer, width, height);
        } else {
          const targetResolution = resolutions[key];
          const targetSize = sizeTargets[key];
          processedBuffer = await convertToTargetSizeAndResolution(
            originalImageBuffer,
            targetSize,
            targetResolution,
            format
          );
        }

        const upload = new Upload({
          client: s3,
          params: {
            Bucket: process.env.AWS_BUCKET,
            Key: fileKey,
            Body: processedBuffer,
            ContentType: req.file.mimetype,
          },
        });

        await upload.done();

        return { key, url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}` };
      });

      const uploadResults = await Promise.all(uploadPromises);

      const urls = uploadResults.reduce((acc, { key, url }) => {
        acc[key] = url;
        return acc;
      }, {});

      const returnedResolutions = { original: { width, height } };
      if (fileSizeInMB > 10) {
        returnedResolutions.medium = resolutions.medium;
        returnedResolutions.small = resolutions.small;
      } else if (fileSizeInMB > 4) {
        returnedResolutions.small = resolutions.small;
      }

      res.send({ urls, resolutions: returnedResolutions });
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).send("Failed to upload image.");
    }
  }
);


const convertToTargetSizeAndResolution = async (buffer, targetResolution, format) => {
  let processedBuffer;

  // Only resize if targetResolution is provided (e.g., for small/medium sizes)
  if (targetResolution) {
    processedBuffer = await sharp(buffer)
      .resize(targetResolution.width, targetResolution.height, { fit: "inside" }) // Ensure the aspect ratio is preserved
      .toBuffer();
  } else {
    // If it's the original image, don't resize or compress it
    processedBuffer = buffer;
  }

  // // Set quality only for formats like jpeg, png, or webp
  // if (format === "jpeg" || format === "jpg") {
  //   processedBuffer = await sharp(processedBuffer)
  //     .jpeg({ quality: 90 })  // Set consistent quality for JPEG
  //     .toBuffer();
  // } else if (format === "png") {
  //   processedBuffer = await sharp(processedBuffer)
  //     .png({ compressionLevel: 9, quality: 100 })  // Set consistent quality for PNG
  //     .toBuffer();
  // } else if (format === "webp") {
  //   processedBuffer = await sharp(processedBuffer)
  //     .webp({ quality: 90 })  // Set consistent quality for WebP
  //     .toBuffer();
  // }

  return processedBuffer;
};




// async function compressImage(buffer) {
//   try {
//     let quality = 90;
//     let outputBuffer = await sharp(buffer)
//       .webp({ quality })
//       .toBuffer();
//       console.log(outputBuffer)
//     // Reduce quality iteratively until size <= 500KB
//     while (outputBuffer.length > 500 * 1024 && quality > 10) {
//       quality -= 5;
//       outputBuffer = await sharp(buffer)
//         .webp({ quality })
//         .toBuffer();
//     }
//     console.log(outputBuffer)
//     return outputBuffer;
//   } catch (error) {
//     console.error('Error compressing image:', error);
//     throw error;
//   }
// }



router.post('/share-size-of-original-image', upload1.single('image'), async (req, res) => {
  const imageUrl = req.body.imageUrl;
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const imageBuffer = Buffer.from(response.data);
  //
  const metadata1 = await sharp(imageBuffer).metadata();
  const dimensions = sizeOf(imageBuffer);
  const width1 = metadata1.width;
  const height1 = metadata1.height;
  const width2 = dimensions.width
  const height2 = dimensions.height

  //
  res.status(200).send({
    width1,
    height1,
    dimensions
  })

})


// async function compressImage(inputBuffer, quality = 4) {
//   const imagemin = (await import('imagemin')).default;
//   const imageminWebp = (await import('imagemin-webp')).default;

//   const outputBuffer = await imagemin.buffer(inputBuffer, {
//     plugins: [
//       imageminWebp({
//         quality: 4,       
//         method: 6,
//         alphaQuality: 10,
//         nearLossless: 1, // Use 0 (off) or 1 (on), not 'true'
//         smartSubsample: true,
//       }),
//     ],
//   });
  
//   return outputBuffer;
// }

async function compressToExactSize(buffer, targetKB = 500) {
  const targetBytes = targetKB * 1024;

  // Step 1: Resize based on an estimated megapixels ratio
  const megapixels = targetBytes / (100 * 1024); // 100KB per MP approx.
  const side = Math.sqrt(megapixels) * 1000; // Estimate size from MP

  // Step 2: Resize image
  const resizedBuffer = await sharp(buffer)
    .resize({
      width: Math.round(side),
      height: Math.round(side),
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer();

  // Step 3: Compress to WebP
  let outputBuffer = await sharp(resizedBuffer)
    .webp({
      quality: 20,  // Adjust for balance
      effort: 6,    // Medium compression
      nearLossless: false,
      smartSubsample: true,
      lossless: false, 
      alphaQuality: 50, 
    })
    .toBuffer();

  console.log(`Final size: ${(outputBuffer.byteLength / 1024).toFixed(2)} KB`);
  return outputBuffer;
}



router.post(
  "/handle-photos-with-watermark-and-resolutions-options",
  upload1.single("image"),
  async (req, res) => {
    try {
      const plan = req.body.plan;
      const isCustomText = req.body.isCustomText === "true";
      const customText = req.body.customText;
      const imageUrl = req.body.imageUrl;

      const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const imageBuffer = Buffer.from(response.data);
      const correctedImageBuffer = await sharp(imageBuffer).rotate().toBuffer(); 

      let watermarkBuffer;

      if (plan === "basic") {
        const royaltySettings = await RoyaltySettings.findOne();

        if (royaltySettings && royaltySettings.watermarkImage) {
          const response = await axios.get(royaltySettings.watermarkImage, {
            responseType: "arraybuffer",
          });
  // Changes
          const originalImage = await sharp(correctedImageBuffer).metadata();
          const originalWidth = originalImage.width;
          const originalHeight = originalImage.height;

          const watermarkScaleFactor = 0.3; 
          const watermarkWidth = originalWidth * watermarkScaleFactor;
          const watermarkHeight = originalHeight * watermarkScaleFactor;

          const royaltyBuffer = Buffer.from(response.data);

          // watermarkBuffer = await sharp(royaltyBuffer)
          // .resize(Math.round(watermarkWidth), Math.round(watermarkHeight)) 
          // .png() 
          // .toBuffer();

            watermarkBuffer = await sharp(royaltyBuffer)
            .resize({
              width: Math.round(watermarkWidth),
              height: Math.round(watermarkHeight),
              fit: sharp.fit.inside,  
              withoutEnlargement: true,  
            })
            .ensureAlpha()  
            .modulate({
              brightness: 1,
              opacity: 0.05,  
            })
            .png()
            .toBuffer();

            // To Done         
            // royaltyBuffer = Buffer.from(response.data);
            // watermarkBuffer = await sharp(royaltyBuffer).png().toBuffer(); 
        }

        if (!royaltySettings || !royaltySettings.watermarkImage || !watermarkBuffer) {
          const { width, height } = await sharp(correctedImageBuffer).metadata();
          watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
        }
      } else if (plan === "intermediate" || (plan === "premium" && isCustomText)) {
        if (!customText) {
          return res.status(400).send("Custom text is required.");
        }
        console.log('premium && customText')
        const { width, height } = await sharp(correctedImageBuffer).metadata();
        
        watermarkBuffer = await createTextImageBuffer(customText, width, height);
      } else if (plan === "premium" && !isCustomText) {
        console.log('premium' && 'no custom text')
        const customWatermark = await CustomWatermark.findOne({ photographer: req.body.photographer });
        if (!customWatermark || !customWatermark.watermarkImage) {
          return res.status(400).send("Custom watermark image not found.");
        }
        const watermarkUrl = customWatermark.watermarkImage;

        const watermarkResponse = await axios.get(watermarkUrl, { responseType: "arraybuffer" });
        const originalWatermarkBuffer = Buffer.from(watermarkResponse.data);
        watermarkBuffer = await removeBackgroundWithSharp(originalWatermarkBuffer);

        
      } else {
        return res.status(400).send("Invalid plan.");
      }

      const addWatermark = async (buffer, metadata, isCustomImage = false) => {
        const { width, height } = metadata;

        if (!watermarkBuffer) {
          return buffer;
        }

        if (isCustomImage) {
          const watermarkWidth = Math.round(width * 0.2);
          const watermarkHeight = Math.round(height * 0.2);

          const watermarkResized = await sharp(watermarkBuffer)
            .resize(watermarkWidth, watermarkHeight, { fit: "inside" })
            .toBuffer();

          return sharp(buffer)
            .composite([
              {
                input: watermarkResized,
                gravity: "center",
                blend: "over",
              },
            ])
            .toBuffer();
        } else {
          return sharp(buffer)
            .composite([
              {
                input: watermarkBuffer,
                gravity: "center",
                blend: "over",
              },
            ])
            .toBuffer();
        }
      };

      const convertToTargetSizeAndResolution = async (buffer, targetResolution, metadata) => {
        const { width, height } = metadata;
        const originalAspectRatio = width / height;
        const targetAspectRatio = targetResolution.width / targetResolution.height;

        let resizeOptions;
        if (originalAspectRatio > targetAspectRatio) {
          resizeOptions = { width: targetResolution.width };
        } else {
          resizeOptions = { height: targetResolution.height };
        }

        const processedBuffer = await sharp(buffer).resize(resizeOptions).toBuffer();
        return processedBuffer;
      };

      const metadata = await sharp(correctedImageBuffer).metadata();
      const { width, height } = metadata;
      const imageSizeInMP = (width * height) / 1_000_000;
      console.log(`Original Image Size: ${imageSizeInMP.toFixed(2)} MP`);

      // const resolutions = {
      //   small: {
      //     width: Math.round(Math.sqrt(2 * 1_000_000 * Math.max(width / height, 1))),
      //     height: Math.round(Math.sqrt(2 * 1_000_000 * Math.max(height / width, 1))),
      //   },
      //   medium: {
      //     width: Math.round(Math.sqrt(12 * 1_000_000 * Math.max(width / height, 1))),
      //     height: Math.round(Math.sqrt(12 * 1_000_000 * Math.max(height / width, 1))),
      //   },
      // };
      

      const resolutions = {
        small: {
          width: Math.round(Math.sqrt(2 * 1_000_000 * (width / height))),
          height: Math.round(Math.sqrt(2 * 1_000_000 * (height / width))),
        },
        medium: {
          width: Math.round(Math.sqrt(12 * 1_000_000 * (width / height))),
          height: Math.round(Math.sqrt(12 * 1_000_000 * (height / width))),
        },
      };

      console.log(
        `Small Resolution: ${resolutions.small.width}x${resolutions.small.height} (${(
          (resolutions.small.width * resolutions.small.height) /
          1_000_000
        ).toFixed(2)} MP)`
      );
      console.log(
        `Medium Resolution: ${resolutions.medium.width}x${resolutions.medium.height} (${(
          (resolutions.medium.width * resolutions.medium.height) /
          1_000_000
        ).toFixed(2)} MP)`
      );

      const conversionTargets =
        imageSizeInMP > 12
          ? ["small", "medium"]
          : imageSizeInMP > 4
          ? ["small"]
          : [];

      const uploadPromises = ["thumbnail", "original", ...conversionTargets].map(
        async (key) => {
          
          // const fileName = `${Date.now()}_${Math.round(
          //   Math.random() * 1e9
          // )}_${key}_${req.body.imageUrl.split("/").pop()}`;
          // const fileKey = `images/${fileName}`;

          const extension = key === "thumbnail" ? "webp" : req.body.imageUrl.split(".").pop();
          const fileName = `${Date.now()}_${Math.round(
              Math.random() * 1e9
          )}_${key}.${extension}`;
          const fileKey = `images/${fileName}`;
          console.log(fileKey)

          let processedBuffer;
          
          if (key === "thumbnail") {
            processedBuffer = await addWatermark(
              correctedImageBuffer,
              metadata,
              plan === "premium" && !isCustomText
            );

            processedBuffer = await sharp(processedBuffer)
                                    // .toFormat('webp') 
                                    .webp({ quality: 80 })
                                    .toBuffer();

            if (processedBuffer.length >  500 * 1024) {
              console.log("Thumbnail exceeds 500KB, reducing quality...");
              // processedBuffer = await sharp(processedBuffer)
              //   .resize({ width, fit: 'inside' })
              //   .webp({ quality: 5 }) 
              //   .toBuffer();
              processedBuffer = await compressToExactSize(processedBuffer)
             
            }

            const metadataAfterWebP = await sharp(processedBuffer).metadata();
            console.log("Thumbnail format after conversion:", metadataAfterWebP.format);

          } else if (key === "original") {
            processedBuffer = correctedImageBuffer;
          } else {
            const targetResolution = resolutions[key];
            processedBuffer = await convertToTargetSizeAndResolution(
              correctedImageBuffer,
              targetResolution,
              metadata
            );
          }
         

          const upload = new Upload({
            client: s3,
            params: {
              Bucket: process.env.AWS_BUCKET,
              Key: fileKey,
              Body: processedBuffer,
              ContentType: key === "thumbnail" ? "image/webp" : response.headers["content-type"],
            },
          });

          await upload.done();

          return {
            key,
            url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}`,
          };
        }
      );

      const uploadResults = await Promise.all(uploadPromises);

      const urls = uploadResults.reduce((acc, { key, url }) => {
        acc[key] = url;
        return acc;
      }, {});
      const originalImageMetaData = await sharp(imageBuffer).metadata();
      const returnedResolutions = { thumbnail: { width, height }, original: { width: originalImageMetaData.width, height: originalImageMetaData.height } };
      if (imageSizeInMP > 12) {
        returnedResolutions.medium = resolutions.medium;
        returnedResolutions.small = resolutions.small;
      } else if (imageSizeInMP > 4) {
        returnedResolutions.small = resolutions.small;
      }
      urls.original = imageUrl
     
      
      res.send({ urls, resolutions: returnedResolutions });
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).send("Failed to upload image.");
    }
  }
);



const createTextImageBuffer = async (text, width, height) => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" fill="rgba(255, 255, 255, 0.3)" font-family="'Brush Script MT', cursive" font-size="${Math.round(
        height * 0.07
      )}" text-anchor="middle" dominant-baseline="middle">${text}</text>
    </svg>
  `;
  return Buffer.from(svg);
};



 const removeBackgroundWithSharp = async (buffer) => {
  return buffer
};
 

router.post("/upload-watermark-image", async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).send("No image URL provided.");
  }

  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    
    const imageBuffer = Buffer.from(response.data);

    const processedBuffer = await sharp(imageBuffer)
  .ensureAlpha() 
  .raw() 
  .toBuffer({ resolveWithObject: true }) 
  .then(({ data, info }) => {
   
    const pixelData = Buffer.from(data);
    for (let i = 3; i < pixelData.length; i += 4) {
      pixelData[i] = Math.round(pixelData[i] * 0.5); 
    }
    return sharp(pixelData, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels,
      },
    })
      .toFormat("png") 
      .toBuffer();
  });


      const fileName = `${Date.now()}_${Math.round(
        Math.random() * 1e9
      )}_watermark_${req.body.imageUrl.split("/").pop()}`;
      const fileKey = `images/${fileName}`;


    const upload = new Upload({
      client: s3,
      params: {
        Bucket: process.env.AWS_BUCKET,
        Key: fileKey,
        Body: processedBuffer,
        // ContentType: req.file.mimetype,
      },
    });

    await upload.done();

    res.send({ message: "Image processed and uploaded", url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}` });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).send("Failed to process and upload the image.");
  }
});




module.exports = router