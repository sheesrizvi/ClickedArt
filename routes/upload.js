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


router.post(
  "/uploadSingleImage",
  upload.single("image"),
  async (req, res) => {
    const result = req.file;

    if (!result) {
      return res.status(400).send("No file uploaded.");
    }
  
    res.send(`${result.location}`);
  }
);


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




// handle fourth testing


// router.post(
//   "/handle-photos-with-watermark-and-resolutions-options",
//   upload1.single("image"),
//   async (req, res) => {
//     try {

//       const plan = req.body.plan;
//       const isCustomText = req.body.isCustomText === "true";
//       const customText = req.body.customText;
//       const imageUrl = req.body.imageUrl;

//       const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
//       const imageBuffer = Buffer.from(response.data);


//       const image = sharp(imageBuffer);
//       const metadata = await image.metadata();
//       const rotatedImage = await image.rotate().toBuffer();

//       let watermarkBuffer;

//       if (plan === "basic") {
//         const royaltySettings = await RoyaltySettings.findOne();

//         if(royaltySettings && royaltySettings.watermarkImage ) {
//           const response = await axios.get(royaltySettings.watermarkImage, {
//             responseType: 'arraybuffer'
//           })
//           watermarkBuffer = Buffer.from(response.data)
//         }

//         if(!royaltySettings || !royaltySettings.watermarkImage || !watermarkBuffer) {
//           const { width, height } = await sharp(imageBuffer).metadata();
//           watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
//         }
       
//       } else if (plan === "intermediate" || (plan === "premium" && isCustomText)) {
//         if (!customText) {
//           return res.status(400).send("Custom text is required.");
//         }
//         const { width, height } = await sharp(imageBuffer).metadata();
//         watermarkBuffer = await createTextImageBuffer(customText, width, height);
//       } else if (plan === "premium" && !isCustomText) {
//         const customWatermark = await CustomWatermark.findOne({ photographer: req.body.photographer });
//         if (!customWatermark || !customWatermark.watermarkImage) {
//           return res.status(400).send("Custom watermark image not found.");
//         }
//         const watermarkUrl = customWatermark.watermarkImage;
       
//         const watermarkResponse = await axios.get(watermarkUrl, { responseType: "arraybuffer" });
//         const originalWatermarkBuffer = Buffer.from(watermarkResponse.data);
//         watermarkBuffer = await removeBackgroundWithSharp(originalWatermarkBuffer);
       
//       } else {
//         return res.status(400).send("Invalid plan.");
//       }

//       const addWatermark = async (buffer, width, height, isCustomImage = false) => {
//         if (!watermarkBuffer) {
//           return buffer;
//         }

//         if (isCustomImage) {
//           const watermarkWidth = Math.round(width * 0.1);
//           const watermarkHeight = Math.round(height * 0.1);

//           const watermarkResized = await sharp(watermarkBuffer)
//             .resize(watermarkWidth, watermarkHeight, { fit: "inside" })
//             .toBuffer();

//           return sharp(buffer)
//             .composite([
//               {
//                 input: watermarkResized,
//                 gravity: "center",
//                 blend: "over",
//               },
//             ])
//             .toBuffer();
//         } else {
//           return sharp(buffer)
//             .composite([
//               {
//                 input: watermarkBuffer,
//                 gravity: "center",
//                 blend: "over",
//               },
//             ])
//             .toBuffer();
//         }
//       };

//       const convertToTargetSizeAndResolution = async (buffer, targetResolution, format) => {
//         let processedBuffer = await sharp(buffer)
//           .resize(targetResolution.width, targetResolution.height)
//           .toBuffer();

//         // if (format === "jpeg" || format === "jpg") {
//         //   let quality = 90;
//         //   while (true) {
//         //     processedBuffer = await sharp(processedBuffer)
//         //       .jpeg({ quality })
//         //       .toBuffer();

//         //     if (quality <= 10) {
//         //       break;
//         //     }
//         //     quality -= 5;
//         //   }
//         // } else if (format === "png") {
//         //   processedBuffer = await sharp(processedBuffer)
//         //     .png({ compressionLevel: 9, quality: 100 })
//         //     .toBuffer();
//         // } else if (format === "webp") {
//         //   let quality = 90;
//         //   while (true) {
//         //     processedBuffer = await sharp(processedBuffer)
//         //       .webp({ quality })
//         //       .toBuffer();

//         //     if (quality <= 10) {
//         //       break;
//         //     }
//         //     quality -= 5;
//         //   }
//         // } else {
//         //   processedBuffer = await sharp(processedBuffer)
//         //     .jpeg({ quality: 85 })
//         //     .toBuffer();
//         // }

//         return processedBuffer;
//       };

//       const { width, height, format } = await sharp(imageBuffer).metadata();
//       const imageSizeInMP = (width * height) / 1_000_000;
//       console.log(`Original Image Size: ${imageSizeInMP.toFixed(2)} MP`);
//       const resolutions = {
//         small: {
//           width: Math.round(Math.sqrt(2 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(2 * 1_000_000 * (height / width))),
//         },
//         medium: {
//           width: Math.round(Math.sqrt(12 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(12 * 1_000_000 * (height / width))),
//         },
//       };

//       console.log(`Small Resolution: ${resolutions.small.width}x${resolutions.small.height} (${(resolutions.small.width * resolutions.small.height / 1_000_000).toFixed(2)} MP)`);
//       console.log(`Medium Resolution: ${resolutions.medium.width}x${resolutions.medium.height} (${(resolutions.medium.width * resolutions.medium.height / 1_000_000).toFixed(2)} MP)`);

//       const conversionTargets =
//         imageSizeInMP > 12
//           ? ["small", "medium"]
//           : imageSizeInMP > 4
//           ? ["small"]
//           : [];

//       const uploadPromises = ["thumbnail", "original", ...conversionTargets].map(async (key) => {
//         const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${req.body.imageUrl.split("/").pop()}`;
//         const fileKey = `images/${fileName}`;

//         let processedBuffer;
//         if (key === "thumbnail") {
//           processedBuffer = await addWatermark(imageBuffer, width, height, plan === "premium" && !isCustomText);
//         } else if (key === "original") {
//           processedBuffer = imageBuffer;
//         } else {
//           const targetResolution = resolutions[key];
//           processedBuffer = await convertToTargetSizeAndResolution(
//             imageBuffer,
//             targetResolution,
//             format
//           );
//         }

//         const upload = new Upload({
//           client: s3,
//           params: {
//             Bucket: process.env.AWS_BUCKET,
//             Key: fileKey,
//             Body: processedBuffer,
//             ContentType: response.headers["content-type"],
//           },
//         });

//         await upload.done();

//         return { key, url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}` };
//       });

//       const uploadResults = await Promise.all(uploadPromises);

//       const urls = uploadResults.reduce((acc, { key, url }) => {
//         acc[key] = url;
//         return acc;
//       }, {});

//       const returnedResolutions = { thumbnail: { width, height }, original: { width, height } };
//       if (imageSizeInMP > 12) {
//         returnedResolutions.medium = resolutions.medium;
//         returnedResolutions.small = resolutions.small;
//       } else if (imageSizeInMP > 4) {
//         returnedResolutions.small = resolutions.small;
//       }

//       res.send({ urls, resolutions: returnedResolutions });
//     } catch (error) {
//       console.error("Error processing image:", error);
//       res.status(500).send("Failed to upload image.");
//     }
//   }
// );





// New Testing Chnage

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

// Main route


// router.post(
//   "/handle-photos-with-watermark-and-resolutions-options",
//   upload1.single("image"),
//   async (req, res) => {
//     try {
//       const plan = req.body.plan;
//       const isCustomText = req.body.isCustomText === "true";
//       const customText = req.body.customText;
//       const imageUrl = req.body.imageUrl;

//       // Fetch the image
//       const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
//       const imageBuffer = Buffer.from(response.data);

//       // Correct image orientation using EXIF data
//       const image = sharp(imageBuffer);
//       const metadata = await image.metadata();
//       const rotatedImage = await image
//         .rotate() // Correct orientation
//         .toFormat(metadata.format, 
//           {
//           quality: metadata.format === "jpeg" ? 100 : undefined, // Preserve JPEG quality
//           compressionLevel: metadata.format === "png" ? 6 : undefined, // Disable PNG compression
//         }
//       )
//         .toBuffer();

//       let watermarkBuffer;

//       // Handle watermark logic
//       if (plan === "basic") {
//         const royaltySettings = await RoyaltySettings.findOne();

//         if (royaltySettings && royaltySettings.watermarkImage) {
//           const response = await axios.get(royaltySettings.watermarkImage, {
//             responseType: "arraybuffer",
//           });
//           watermarkBuffer = Buffer.from(response.data);
//         }

//         if (!royaltySettings || !royaltySettings.watermarkImage || !watermarkBuffer) {
//           const { width, height } = await sharp(rotatedImage).metadata();
//           watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
//         }
//       } else if (plan === "intermediate" || (plan === "premium" && isCustomText)) {
//         if (!customText) {
//           return res.status(400).send("Custom text is required.");
//         }
//         const { width, height } = await sharp(rotatedImage).metadata();
//         watermarkBuffer = await createTextImageBuffer(customText, width, height);
//       } else if (plan === "premium" && !isCustomText) {
//         const customWatermark = await CustomWatermark.findOne({ photographer: req.body.photographer });
//         if (!customWatermark || !customWatermark.watermarkImage) {
//           return res.status(400).send("Custom watermark image not found.");
//         }
//         const watermarkUrl = customWatermark.watermarkImage;

//         const watermarkResponse = await axios.get(watermarkUrl, { responseType: "arraybuffer" });
//         const originalWatermarkBuffer = Buffer.from(watermarkResponse.data);
//         watermarkBuffer = await removeBackgroundWithSharp(originalWatermarkBuffer);
//       } else {
//         return res.status(400).send("Invalid plan.");
//       }

//       // Add watermark function
//       const addWatermark = async (buffer, width, height, isCustomImage = false) => {
//         if (!watermarkBuffer) {
//           return buffer;
//         }

//         if (isCustomImage) {
//           const watermarkWidth = Math.round(width * 0.1);
//           const watermarkHeight = Math.round(height * 0.1);

//           const watermarkResized = await sharp(watermarkBuffer)
//             .resize(watermarkWidth, watermarkHeight, { fit: "inside" })
//             .toBuffer();

//           return sharp(buffer)
//             .composite([{ input: watermarkResized, gravity: "center", blend: "over" }])
//             .toBuffer();
//         } else {
//           return sharp(buffer)
//             .composite([{ input: watermarkBuffer, gravity: "center", blend: "over" }])
//             .toBuffer();
//         }
//       };

//       // Convert to target resolution
//       const convertToTargetSizeAndResolution = async (buffer, targetResolution, format) => {
//         const processedBuffer = await sharp(buffer)
//           .resize(targetResolution.width, targetResolution.height, { fit: "inside" })
//           .toFormat(format,
//              {
//             quality: format === "jpeg" ? 100 : undefined,
//             compressionLevel: format === "png" ? 6 : undefined,
//           }
//         )
//           .toBuffer();

//         return processedBuffer;
//       };

//       // Prepare resolution targets
//       const { width, height, format } = metadata;
//       const imageSizeInMP = (width * height) / 1_000_000;
//       const resolutions = {
//         small: {
//           width: Math.round(Math.sqrt(2 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(2 * 1_000_000 * (height / width))),
//         },
//         medium: {
//           width: Math.round(Math.sqrt(12 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(12 * 1_000_000 * (height / width))),
//         },
//       };

//       const conversionTargets =
//         imageSizeInMP > 12 ? ["small", "medium"] : imageSizeInMP > 4 ? ["small"] : [];

//       // Process uploads
//       const uploadPromises = ["thumbnail", "original", ...conversionTargets].map(async (key) => {
//         const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${req.body.imageUrl.split("/").pop()}`;
//         const fileKey = `images/${fileName}`;

//         let processedBuffer;
//         if (key === "thumbnail") {
//           processedBuffer = await addWatermark(rotatedImage, width, height, plan === "premium" && !isCustomText);
//         } else if (key === "original") {
//           processedBuffer = rotatedImage;
//         } else {
//           const targetResolution = resolutions[key];
//           processedBuffer = await convertToTargetSizeAndResolution(rotatedImage, targetResolution, format);
//         }

//         const upload = new Upload({
//           client: s3,
//           params: {
//             Bucket: process.env.AWS_BUCKET,
//             Key: fileKey,
//             Body: processedBuffer,
//             ContentType: response.headers["content-type"],
//           },
//         });

//         await upload.done();

//         return { key, url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}` };
//       });

//       const uploadResults = await Promise.all(uploadPromises);

//       const urls = uploadResults.reduce((acc, { key, url }) => {
//         acc[key] = url;
//         return acc;
//       }, {});

//       const returnedResolutions = { thumbnail: { width, height }, original: { width, height } };
//       if (imageSizeInMP > 12) {
//         returnedResolutions.medium = resolutions.medium;
//         returnedResolutions.small = resolutions.small;
//       } else if (imageSizeInMP > 4) {
//         returnedResolutions.small = resolutions.small;
//       }

//       res.send({ urls, resolutions: returnedResolutions });
//     } catch (error) {
//       console.error("Error processing image:", error);
//       res.status(500).send("Failed to upload image.");
//     }
//   }
// );


// const createTextImageBuffer = async (text, width, height) => {
//   const svg = `
//     <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
//       <text x="50%" y="50%" class="text" fill="rgba(255, 255, 255, 0.3)" font-family="'Brush Script MT', cursive" font-size="${Math.round(
//         height * 0.07
//       )}" text-anchor="middle" dominant-baseline="middle">${text}</text>
//     </svg>
//   `;
//   return Buffer.from(svg);
// };

// const removeBackgroundWithSharp = async (buffer) => {
//   return buffer
// };

// handle fifth testing


// fifth testing



// router.post(
//   "/handle-photos-with-watermark-and-resolutions-options",
//   upload1.single("image"),
//   async (req, res) => {
//     try {
//       const { plan, isCustomText, customText, imageUrl } = req.body;

//       const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
//       const imageBuffer = Buffer.from(response.data);

//       const metadata = await sharp(imageBuffer).metadata();
//       const { width, height, format } = metadata;
//       console.log(`Original Image Size: ${width}x${height} (${(width * height / 1_000_000).toFixed(2)} MP)`);
      
//       let watermarkBuffer;

//       if (plan === "basic") {
//         const royaltySettings = await RoyaltySettings.findOne();
//         if (royaltySettings?.watermarkImage) {
//           const watermarkResponse = await axios.get(royaltySettings.watermarkImage, { responseType: "arraybuffer" });
//           watermarkBuffer = Buffer.from(watermarkResponse.data);
//         } else {
//           watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
//         }
//       } else if (plan === "intermediate" || (plan === "premium" && isCustomText === "true")) {
//         if (!customText) {
//           return res.status(400).send("Custom text is required.");
//         }
//         watermarkBuffer = await createTextImageBuffer(customText, width, height);
//       } else if (plan === "premium") {
//         const customWatermark = await CustomWatermark.findOne({ photographer: req.body.photographer });
//         if (!customWatermark?.watermarkImage) {
//           return res.status(400).send("Custom watermark image not found.");
//         }
//         const watermarkResponse = await axios.get(customWatermark.watermarkImage, { responseType: "arraybuffer" });
//         watermarkBuffer = Buffer.from(watermarkResponse.data);
//       } else {
//         return res.status(400).send("Invalid plan.");
//       }

//       const addWatermark = async (buffer, isCustomImage = false) => {
//         if (!watermarkBuffer) {
//           return buffer; 
//         }

//         const watermarkResized = await sharp(watermarkBuffer)
//           .resize(width * 0.1, height * 0.1, { fit: "inside" })
//           .toBuffer();

//         return sharp(buffer)
//           .composite([{ input: watermarkResized, gravity: "center", blend: "over" }])
//           .toBuffer();
//       };

//       const resolutions = {
//         small: {
//           width: Math.max(Math.round(Math.sqrt(2 * 1_000_000 * (width / height))), 1),
//           height: Math.max(Math.round(Math.sqrt(2 * 1_000_000 * (height / width))), 1),
//         },
//         medium: {
//           width: Math.max(Math.round(Math.sqrt(12 * 1_000_000 * (width / height))), 1),
//           height: Math.max(Math.round(Math.sqrt(12 * 1_000_000 * (height / width))), 1),
//         },
//       };
      
//       console.log(`Small Resolution: ${resolutions.small.width}x${resolutions.small.height} (${(resolutions.small.width * resolutions.small.height / 1_000_000).toFixed(2)} MP)`);
//       console.log(`Medium Resolution: ${resolutions.medium.width}x${resolutions.medium.height} (${(resolutions.medium.width * resolutions.medium.height / 1_000_000).toFixed(2)} MP)`);

//       const convertToTargetSize = async (buffer, targetResolution) => {
//         return sharp(buffer)
//           .resize(targetResolution.width, targetResolution.height, { fit: "inside" })
//           .toBuffer();
//       };

//       // const rotateImageBuffer = async (buffer) => {
//       //   return sharp(buffer).rotate().toBuffer(); 
//       // };

//       const rotateImageBuffer = async (buffer) => {
//         const rotatedBuffer = await sharp(buffer).rotate().toBuffer();
//         const rotatedMetadata = await sharp(rotatedBuffer).metadata();
//         return { buffer: rotatedBuffer, metadata: rotatedMetadata };
//       };
      

//       const conversionTargets =
//         width * height > 12 * 1_000_000
//           ? ["small", "medium"]
//           : width * height > 4 * 1_000_000
//           ? ["small"]
//           : [];

//       // const uploadPromises = ["thumbnail", "original", ...conversionTargets].map(async (key) => {
//       //   const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${imageUrl.split("/").pop()}`;
//       //   const fileKey = `images/${fileName}`;

//       //   let processedBuffer;

//       //   if (key === "thumbnail") {
//       //     const rotatedThumbnail = await rotateImageBuffer(imageBuffer); 
//       //     processedBuffer = await addWatermark(rotatedThumbnail, plan === "premium" && !isCustomText);
//       //   } else if (key === "original") {
//       //     processedBuffer = imageBuffer;
//       //   } else {
//       //     const rotatedImage = await rotateImageBuffer(imageBuffer); 
//       //     const targetResolution = resolutions[key];
//       //     processedBuffer = await convertToTargetSize(rotatedImage, targetResolution);
//       //     processedBuffer = await addWatermark(processedBuffer, plan === "premium" && !isCustomText);
//       //   }

//       //   const upload = new Upload({
//       //     client: s3,
//       //     params: {
//       //       Bucket: process.env.AWS_BUCKET,
//       //       Key: fileKey,
//       //       Body: processedBuffer,
//       //       ContentType: response.headers["content-type"],
//       //     },
//       //   });

//       //   await upload.done();

//       //   return { key, url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}` };
//       // });


//       const uploadPromises = ["thumbnail", "original", ...conversionTargets].map(async (key) => {
//         const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${imageUrl.split("/").pop()}`;
//         const fileKey = `images/${fileName}`;
      
//         let processedBuffer;
//         let currentWidth = width;
//         let currentHeight = height;
      
//         if (key === "thumbnail") {
//           const { buffer: rotatedThumbnail, metadata: thumbnailMetadata } = await rotateImageBuffer(imageBuffer);
//           currentWidth = thumbnailMetadata.width;
//           currentHeight = thumbnailMetadata.height;
      
//           processedBuffer = await addWatermark(rotatedThumbnail, plan === "premium" && !isCustomText);
//         } else if (key === "original") {
//           processedBuffer = imageBuffer;
//         } else {
//           const { buffer: rotatedImage, metadata: rotatedMetadata } = await rotateImageBuffer(imageBuffer);
//           currentWidth = rotatedMetadata.width;
//           currentHeight = rotatedMetadata.height;
      
//           const targetResolution = resolutions[key];
//           processedBuffer = await convertToTargetSize(rotatedImage, targetResolution);
//           processedBuffer = await addWatermark(processedBuffer, plan === "premium" && !isCustomText);
//         }
      
//         const upload = new Upload({
//           client: s3,
//           params: {
//             Bucket: process.env.AWS_BUCKET,
//             Key: fileKey,
//             Body: processedBuffer,
//             ContentType: response.headers["content-type"],
//           },
//         });
      
//         await upload.done();
      
//         return { key, url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}` };
//       });
      
//       const uploadResults = await Promise.all(uploadPromises);

//       const urls = uploadResults.reduce((acc, { key, url }) => {
//         acc[key] = url;
//         return acc;
//       }, {});

//       const returnedResolutions = {
//         thumbnail: { width, height },
//         original: { width, height },
//       };

//       if (width * height > 12 * 1_000_000) {
//         returnedResolutions.medium = resolutions.medium;
//         returnedResolutions.small = resolutions.small;
//       } else if (width * height > 4 * 1_000_000) {
//         returnedResolutions.small = resolutions.small;
//       }

//       res.send({ urls, resolutions: returnedResolutions });
//     } catch (error) {
//       console.error("Error processing image:", error);
//       res.status(500).send("Failed to upload image.");
//     }
//   }
// );


// router.post(
//   "/handle-photos-with-watermark-and-resolutions-options",
//   upload1.single("image"),
//   async (req, res) => {
//     try {
//       const { plan, isCustomText, customText, imageUrl } = req.body;

//       const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
//       const imageBuffer = Buffer.from(response.data);

//       const metadata = await sharp(imageBuffer).metadata();
//       const { width, height } = metadata;
//       console.log(`Original Image Size: ${width}x${height} (${(width * height / 1_000_000).toFixed(2)} MP)`);

//       let watermarkBuffer;

//       if (plan === "basic") {
//         const royaltySettings = await RoyaltySettings.findOne();
//         if (royaltySettings?.watermarkImage) {
//           const watermarkResponse = await axios.get(royaltySettings.watermarkImage, { responseType: "arraybuffer" });
//           watermarkBuffer = Buffer.from(watermarkResponse.data);
//         } else {
//           watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
//         }
//       } else if (plan === "intermediate" || (plan === "premium" && isCustomText === "true")) {
//         if (!customText) {
//           return res.status(400).send("Custom text is required.");
//         }
//         watermarkBuffer = await createTextImageBuffer(customText, width, height);
//       } else if (plan === "premium") {
//         const customWatermark = await CustomWatermark.findOne({ photographer: req.body.photographer });
//         if (!customWatermark?.watermarkImage) {
//           return res.status(400).send("Custom watermark image not found.");
//         }
//         const watermarkResponse = await axios.get(customWatermark.watermarkImage, { responseType: "arraybuffer" });
//         watermarkBuffer = Buffer.from(watermarkResponse.data);
//       } else {
//         return res.status(400).send("Invalid plan.");
//       }

//       const addWatermark = async (buffer, isCustomImage = false) => {
//         if (!watermarkBuffer) {
//           return buffer;
//         }

//         const metadata = await sharp(buffer).metadata();
//         const imageWidth = Math.round(metadata.width);
//         const imageHeight = Math.round(metadata.height);

//         console.log(`Image dimensions for watermark: ${imageWidth}x${imageHeight}`);

//         const watermarkResized = await sharp(watermarkBuffer)
//           .resize(Math.round(imageWidth * 0.1), Math.round(imageHeight * 0.1), { fit: "inside" })
//           .toBuffer();

//         return sharp(buffer)
//           .composite([{ input: watermarkResized, gravity: "center", blend: "over" }])
//           .toBuffer();
//       };

//       const convertToTargetSize = async (buffer, targetResolution) => {
//         const { width, height } = targetResolution;

//         console.log(`Converting to target resolution: ${width}x${height}`);

//         return sharp(buffer)
//           .resize(Math.round(width), Math.round(height), { fit: "inside" })
//           .toBuffer();
//       };

//       const rotateImageBuffer = async (buffer) => {
//         const rotatedBuffer = await sharp(buffer).rotate().toBuffer();
//         const rotatedMetadata = await sharp(rotatedBuffer).metadata();

//         console.log(
//           `Rotated image dimensions: ${Math.round(rotatedMetadata.width)}x${Math.round(rotatedMetadata.height)}`
//         );

//         return { buffer: rotatedBuffer, metadata: rotatedMetadata };
//       };

//       const resolutions = {
//         small: {
//           width: Math.round(Math.sqrt(2 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(2 * 1_000_000 * (height / width))),
//         },
//         medium: {
//           width: Math.round(Math.sqrt(12 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(12 * 1_000_000 * (height / width))),
//         },
//       };

//       console.log(`Resolutions:`, resolutions);

//       const conversionTargets =
//         width * height > 12 * 1_000_000
//           ? ["small", "medium"]
//           : width * height > 4 * 1_000_000
//           ? ["small"]
//           : [];

//       const uploadPromises = ["thumbnail", "original", ...conversionTargets].map(async (key) => {
//         const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${imageUrl.split("/").pop()}`;
//         const fileKey = `images/${fileName}`;

//         let processedBuffer;
//         let currentWidth = width;
//         let currentHeight = height;

//         if (key === "thumbnail") {
          
//           const { buffer: rotatedThumbnail, metadata: thumbnailMetadata } = await rotateImageBuffer(imageBuffer);
//           currentWidth = Math.round(thumbnailMetadata.width);
//           currentHeight = Math.round(thumbnailMetadata.height);
        
//           processedBuffer = await addWatermark(rotatedThumbnail, plan === "premium" && !isCustomText);
//         }
//          else if (key === "original") {
//           processedBuffer = imageBuffer;
//         } else {
//           const { buffer: rotatedImage, metadata: rotatedMetadata } = await rotateImageBuffer(imageBuffer);
//           currentWidth = Math.round(rotatedMetadata.width);
//           currentHeight = Math.round(rotatedMetadata.height);

//           const targetResolution = resolutions[key];
//           processedBuffer = await convertToTargetSize(rotatedImage, {
//             width: Math.round(targetResolution.width),
//             height: Math.round(targetResolution.height),
//           });

//           processedBuffer = await addWatermark(processedBuffer, plan === "premium" && !isCustomText);
//         }

//         console.log(`Uploading ${key} with dimensions: ${currentWidth}x${currentHeight}`);

//         const upload = new Upload({
//           client: s3,
//           params: {
//             Bucket: process.env.AWS_BUCKET,
//             Key: fileKey,
//             Body: processedBuffer,
//             ContentType: response.headers["content-type"],
//           },
//         });

//         await upload.done();

//         return { key, url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}` };
//       });

//       const uploadResults = await Promise.all(uploadPromises);

//       const urls = uploadResults.reduce((acc, { key, url }) => {
//         acc[key] = url;
//         return acc;
//       }, {});

//       const returnedResolutions = {
//         thumbnail: { width, height },
//         original: { width, height },
//       };

//       if (width * height > 12 * 1_000_000) {
//         returnedResolutions.medium = resolutions.medium;
//         returnedResolutions.small = resolutions.small;
//       } else if (width * height > 4 * 1_000_000) {
//         returnedResolutions.small = resolutions.small;
//       }

//       res.send({ urls, resolutions: returnedResolutions });
//     } catch (error) {
//       console.error("Error processing image:", error);
//       res.status(500).send("Failed to upload image.");
//     }
//   }
// );

// router.post(
//   "/handle-photos-with-watermark-and-resolutions-options",
//   upload1.single("image"),
//   async (req, res) => {
//     try {
//       const { plan, isCustomText, customText, imageUrl } = req.body;

//       const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
//       const imageBuffer = Buffer.from(response.data);

//       const metadata = await sharp(imageBuffer).metadata();
//       const { width, height } = metadata;
//       console.log(`Original Image Size: ${width}x${height} (${(width * height / 1_000_000).toFixed(2)} MP)`);

//       let watermarkBuffer = null;

//       // Watermark logic based on plan
//       if (plan === "basic") {
//         const royaltySettings = await RoyaltySettings.findOne();
//         if (royaltySettings?.watermarkImage) {
//           const watermarkResponse = await axios.get(royaltySettings.watermarkImage, { responseType: "arraybuffer" });
//           watermarkBuffer = Buffer.from(watermarkResponse.data);
//         } else {
//           watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
//         }
//       } else if (plan === "intermediate" || (plan === "premium" && isCustomText === "true")) {
//         if (!customText) {
//           return res.status(400).send("Custom text is required.");
//         }
//         watermarkBuffer = await createTextImageBuffer(customText, width, height);
//       } else if (plan === "premium") {
//         const customWatermark = await CustomWatermark.findOne({ photographer: req.body.photographer });
//         if (customWatermark?.watermarkImage) {
//           const watermarkResponse = await axios.get(customWatermark.watermarkImage, { responseType: "arraybuffer" });
//           watermarkBuffer = Buffer.from(watermarkResponse.data);
//         } else {
//           return res.status(400).send("Custom watermark image not found.");
//         }
//       } else {
//         return res.status(400).send("Invalid plan.");
//       }

//       // Ensure watermark buffer is available
//       if (!watermarkBuffer) {
//         console.error("Failed to generate watermark buffer.");
//         return res.status(500).send("Failed to generate watermark.");
//       }

//       const addWatermark = async (buffer, isCustomImage = false) => {
//         const metadata = await sharp(buffer).metadata();
//         const imageWidth = Math.round(metadata.width);
//         const imageHeight = Math.round(metadata.height);

//         console.log(`Image dimensions for watermark: ${imageWidth}x${imageHeight}`);

//         // Resize watermark to be 10% of image dimensions
//         const watermarkResized = await sharp(watermarkBuffer)
//           .resize(Math.round(imageWidth * 0.1), Math.round(imageHeight * 0.1), { fit: "inside" })
//           .toBuffer();

//         return sharp(buffer)
//           .composite([{ input: watermarkResized, gravity: "center", blend: "over" }])
//           .toBuffer();
//       };

//       const convertToTargetSize = async (buffer, targetResolution) => {
//         const { width, height } = targetResolution;

//         console.log(`Converting to target resolution: ${width}x${height}`);

//         return sharp(buffer)
//           .resize(Math.round(width), Math.round(height), { fit: "inside" })
//           .toBuffer();
//       };

//       const rotateImageBuffer = async (buffer) => {
//         const rotatedBuffer = await sharp(buffer).rotate().toBuffer();
//         const rotatedMetadata = await sharp(rotatedBuffer).metadata();

//         console.log(
//           `Rotated image dimensions: ${Math.round(rotatedMetadata.width)}x${Math.round(rotatedMetadata.height)}`
//         );

//         return { buffer: rotatedBuffer, metadata: rotatedMetadata };
//       };

//       const resolutions = {
//         small: {
//           width: Math.round(Math.sqrt(2 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(2 * 1_000_000 * (height / width))),
//         },
//         medium: {
//           width: Math.round(Math.sqrt(12 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(12 * 1_000_000 * (height / width))),
//         },
//       };

//       console.log(`Resolutions:`, resolutions);

//       const conversionTargets =
//         width * height > 12 * 1_000_000
//           ? ["small", "medium"]
//           : width * height > 4 * 1_000_000
//           ? ["small"]
//           : [];

//       const uploadPromises = ["thumbnail", "original", ...conversionTargets].map(async (key) => {
//         const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${imageUrl.split("/").pop()}`;
//         const fileKey = `images/${fileName}`;

//         let processedBuffer;
//         let currentWidth = width;
//         let currentHeight = height;

//         if (key === "thumbnail") {
//           const { buffer: rotatedThumbnail, metadata: thumbnailMetadata } = await rotateImageBuffer(imageBuffer);
//           currentWidth = Math.round(thumbnailMetadata.width);
//           currentHeight = Math.round(thumbnailMetadata.height);

//           processedBuffer = await addWatermark(rotatedThumbnail, plan === "premium" && !isCustomText);
//         } else if (key === "original") {
//           processedBuffer = imageBuffer;
//         } else {
//           const { buffer: rotatedImage, metadata: rotatedMetadata } = await rotateImageBuffer(imageBuffer);
//           currentWidth = Math.round(rotatedMetadata.width);
//           currentHeight = Math.round(rotatedMetadata.height);

//           const targetResolution = resolutions[key];
//           processedBuffer = await convertToTargetSize(rotatedImage, {
//             width: Math.round(targetResolution.width),
//             height: Math.round(targetResolution.height),
//           });

//           processedBuffer = await addWatermark(processedBuffer, plan === "premium" && !isCustomText);
//         }

//         console.log(`Uploading ${key} with dimensions: ${currentWidth}x${currentHeight}`);

//         const upload = new Upload({
//           client: s3,
//           params: {
//             Bucket: process.env.AWS_BUCKET,
//             Key: fileKey,
//             Body: processedBuffer,
//             ContentType: response.headers["content-type"],
//           },
//         });

//         await upload.done();

//         return { key, url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}` };
//       });

//       const uploadResults = await Promise.all(uploadPromises);

//       const urls = uploadResults.reduce((acc, { key, url }) => {
//         acc[key] = url;
//         return acc;
//       }, {});

//       const returnedResolutions = {
//         thumbnail: { width, height },
//         original: { width, height },
//       };

//       if (width * height > 12 * 1_000_000) {
//         returnedResolutions.medium = resolutions.medium;
//         returnedResolutions.small = resolutions.small;
//       } else if (width * height > 4 * 1_000_000) {
//         returnedResolutions.small = resolutions.small;
//       }

//       res.send({ urls, resolutions: returnedResolutions });
//     } catch (error) {
//       console.error("Error processing image:", error);
//       res.status(500).send("Failed to upload image.");
//     }
//   }
// );









// New Testing Code


// router.post(
//   "/handle-photos-with-watermark-and-resolutions-options",
//   upload1.single("image"),
//   async (req, res) => {
//     try {

//       const plan = req.body.plan;
//       const isCustomText = req.body.isCustomText === "true";
//       const customText = req.body.customText;
//       const imageUrl = req.body.imageUrl;

//       const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
//       const imageBuffer = Buffer.from(response.data);

//       let watermarkBuffer;

//       if (plan === "basic") {
//         const royaltySettings = await RoyaltySettings.findOne();
       
//         if(royaltySettings && royaltySettings.watermarkImage ) {
         
//           const response = await axios.get(royaltySettings.watermarkImage, {
//             responseType: 'arraybuffer'
//           });

//           watermarkBuffer = Buffer.from(response.data);
//         }

//         if(!royaltySettings || !royaltySettings.watermarkImage || !watermarkBuffer) {
//           const { width, height } = await sharp(imageBuffer).metadata();
//           console.log('clickedart text')
//           watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
//         }
       
//       } else if (plan === "intermediate" || (plan === "premium" && isCustomText)) {
//         if (!customText) {
//           return res.status(400).send("Custom text is required.");
//         }
//         const { width, height } = await sharp(imageBuffer).metadata();
//         watermarkBuffer = await createTextImageBuffer(customText, width, height);
//       } else if (plan === "premium" && !isCustomText) {
//         const customWatermark = await CustomWatermark.findOne({ photographer: req.body.photographer });
//         if (!customWatermark || !customWatermark.watermarkImage) {
//           return res.status(400).send("Custom watermark image not found.");
//         }
//         const watermarkUrl = customWatermark.watermarkImage;
       
//         const watermarkResponse = await axios.get(watermarkUrl, { responseType: "arraybuffer" });
//         const originalWatermarkBuffer = Buffer.from(watermarkResponse.data);
//         watermarkBuffer = await removeBackgroundWithSharp(originalWatermarkBuffer);
       
//       } else {
//         return res.status(400).send("Invalid plan.");
//       }

//       const addWatermark = async (buffer, width, height, isCustomImage = false) => {
//         if (!watermarkBuffer) {
//           return buffer;
//         }

//         if (isCustomImage) {
//           const watermarkWidth = Math.round(width * 0.1);
//           const watermarkHeight = Math.round(height * 0.1);

//           const watermarkResized = await sharp(watermarkBuffer)
//             .resize(watermarkWidth, watermarkHeight, { fit: "inside" })
//             .toBuffer();

//           return sharp(buffer)
//             .composite([
//               {
//                 input: watermarkResized,
//                 gravity: "center",
//                 blend: "over",
//               },
//             ])
//             .toBuffer();
//         } else {
//           return sharp(buffer)
//             .composite([
//               {
//                 input: watermarkBuffer,
//                 gravity: "center",
//                 blend: "over",
//               },
//             ])
//             .toBuffer();
//         }
//       };

//       const convertToTargetSizeAndResolution = async (buffer, targetResolution, format) => {
//         let processedBuffer = await sharp(buffer)
//           .resize(targetResolution.width, targetResolution.height)
//           .toBuffer();

//         return processedBuffer;
//       };

//       const { width, height, format } = await sharp(imageBuffer).metadata();

//       const imageSizeInMP = (width * height) / 1_000_000;

//       console.log(`Original Image Size: ${imageSizeInMP.toFixed(2)} MP`);

//       const resolutions = {
//         small: {
//           width: Math.round(Math.sqrt(2 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(2 * 1_000_000 * (height / width))),
//         },
//         medium: {
//           width: Math.round(Math.sqrt(12 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(12 * 1_000_000 * (height / width))),
//         },
//       };

//       console.log(`Small Resolution: ${resolutions.small.width}x${resolutions.small.height} (${(resolutions.small.width * resolutions.small.height / 1_000_000).toFixed(2)} MP)`);
//       console.log(`Medium Resolution: ${resolutions.medium.width}x${resolutions.medium.height} (${(resolutions.medium.width * resolutions.medium.height / 1_000_000).toFixed(2)} MP)`);

//       const conversionTargets =
//         imageSizeInMP > 12
//           ? ["small", "medium"]
//           : imageSizeInMP > 4
//           ? ["small"]
//           : [];

//       const uploadPromises = ["thumbnail", "original", ...conversionTargets].map(async (key) => {
//         const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${req.body.imageUrl.split("/").pop()}`;
//         const fileKey = `images/${fileName}`;

//         let processedBuffer;
//         if (key === "thumbnail") {
//           processedBuffer = await addWatermark(imageBuffer, width, height, plan === "premium" && !isCustomText);
//         } else if (key === "original") {
//           processedBuffer = imageBuffer;
//         } else {
//           const targetResolution = resolutions[key];
//           processedBuffer = await convertToTargetSizeAndResolution(
//             imageBuffer,
//             targetResolution,
//             format
//           );
//         }

//         const upload = new Upload({
//           client: s3,
//           params: {
//             Bucket: process.env.AWS_BUCKET,
//             Key: fileKey,
//             Body: processedBuffer,
//             ContentType: response.headers["content-type"],
//           },
//         });

//         await upload.done();

//         return { key, url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}` };
//       });

//       const uploadResults = await Promise.all(uploadPromises);

//       const urls = uploadResults.reduce((acc, { key, url }) => {
//         acc[key] = url;
//         return acc;
//       }, {});

//       const returnedResolutions = { thumbnail: { width, height }, original: { width, height } };
//       if (imageSizeInMP > 12) {
//         returnedResolutions.medium = resolutions.medium;
//         returnedResolutions.small = resolutions.small;
//       } else if (imageSizeInMP > 4) {
//         returnedResolutions.small = resolutions.small;
//       }

//       res.send({ urls, resolutions: returnedResolutions });
//     } catch (error) {
//       console.error("Error processing image:", error);
//       res.status(500).send("Failed to upload image.");
//     }
//   }
// );


// router.post(
//   "/handle-photos-with-watermark-and-resolutions-options",
//   upload1.single("image"),
//   async (req, res) => {
//     try {
//       const plan = req.body.plan;
//       const isCustomText = req.body.isCustomText === "true";
//       const customText = req.body.customText;
//       const imageUrl = req.body.imageUrl;

//       const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
//       const imageBuffer = Buffer.from(response.data);

//       let watermarkBuffer;

//       if (plan === "basic") {
//         const royaltySettings = await RoyaltySettings.findOne();

//         if (royaltySettings && royaltySettings.watermarkImage) {
//           const response = await axios.get(royaltySettings.watermarkImage, {
//             responseType: "arraybuffer",
//           });
//           watermarkBuffer = Buffer.from(response.data);
//         }

//         if (!royaltySettings || !royaltySettings.watermarkImage || !watermarkBuffer) {
//           const { width, height } = await sharp(imageBuffer).metadata();
//           watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
//         }
//       } else if (plan === "intermediate" || (plan === "premium" && isCustomText)) {
//         if (!customText) {
//           return res.status(400).send("Custom text is required.");
//         }
//         const { width, height } = await sharp(imageBuffer).metadata();
//         watermarkBuffer = await createTextImageBuffer(customText, width, height);
//       } else if (plan === "premium" && !isCustomText) {
//         const customWatermark = await CustomWatermark.findOne({ photographer: req.body.photographer });
//         if (!customWatermark || !customWatermark.watermarkImage) {
//           return res.status(400).send("Custom watermark image not found.");
//         }
//         const watermarkUrl = customWatermark.watermarkImage;

//         const watermarkResponse = await axios.get(watermarkUrl, { responseType: "arraybuffer" });
//         const originalWatermarkBuffer = Buffer.from(watermarkResponse.data);
//         watermarkBuffer = await removeBackgroundWithSharp(originalWatermarkBuffer);
//       } else {
//         return res.status(400).send("Invalid plan.");
//       }

//       const addWatermark = async (buffer, metadata, isCustomImage = false) => {
//         const { width, height } = metadata;

//         if (!watermarkBuffer) {
//           return buffer;
//         }

//         if (isCustomImage) {
//           const watermarkWidth = Math.round(width * 0.1);
//           const watermarkHeight = Math.round(height * 0.1);

//           const watermarkResized = await sharp(watermarkBuffer)
//             .resize(watermarkWidth, watermarkHeight, { fit: "inside" })
//             .toBuffer();

//           return sharp(buffer)
//             .composite([
//               {
//                 input: watermarkResized,
//                 gravity: "center",
//                 blend: "over",
//               },
//             ])
//             .toBuffer();
//         } else {
//           return sharp(buffer)
//             .composite([
//               {
//                 input: watermarkBuffer,
//                 gravity: "center",
//                 blend: "over",
//               },
//             ])
//             .toBuffer();
//         }
//       };

//       const convertToTargetSizeAndResolution = async (buffer, targetResolution, metadata) => {
//         const { width, height } = metadata;
//         const originalAspectRatio = width / height;
//         const targetAspectRatio = targetResolution.width / targetResolution.height;

//         let resizeOptions;
//         if (originalAspectRatio > targetAspectRatio) {
//           resizeOptions = { width: targetResolution.width };
//         } else {
//           resizeOptions = { height: targetResolution.height };
//         }

//         const processedBuffer = await sharp(buffer).resize(resizeOptions).toBuffer();
//         return processedBuffer;
//       };

//       const metadata = await sharp(imageBuffer).metadata();
//       const { width, height } = metadata;
//       const imageSizeInMP = (width * height) / 1_000_000;
//       console.log(`Original Image Size: ${imageSizeInMP.toFixed(2)} MP`);
//       const resolutions = {
//         small: {
//           width: Math.round(Math.sqrt(2 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(2 * 1_000_000 * (height / width))),
//         },
//         medium: {
//           width: Math.round(Math.sqrt(12 * 1_000_000 * (width / height))),
//           height: Math.round(Math.sqrt(12 * 1_000_000 * (height / width))),
//         },
//       };

//       console.log(
//         `Small Resolution: ${resolutions.small.width}x${resolutions.small.height} (${(
//           (resolutions.small.width * resolutions.small.height) /
//           1_000_000
//         ).toFixed(2)} MP)`
//       );
//       console.log(
//         `Medium Resolution: ${resolutions.medium.width}x${resolutions.medium.height} (${(
//           (resolutions.medium.width * resolutions.medium.height) /
//           1_000_000
//         ).toFixed(2)} MP)`
//       );

//       const conversionTargets =
//         imageSizeInMP > 12
//           ? ["small", "medium"]
//           : imageSizeInMP > 4
//           ? ["small"]
//           : [];

//       const uploadPromises = ["thumbnail", "original", ...conversionTargets].map(
//         async (key) => {
//           const fileName = `${Date.now()}_${Math.round(
//             Math.random() * 1e9
//           )}_${key}_${req.body.imageUrl.split("/").pop()}`;
//           const fileKey = `images/${fileName}`;

//           let processedBuffer;
//           if (key === "thumbnail") {
//             processedBuffer = await addWatermark(
//               imageBuffer,
//               metadata,
//               plan === "premium" && !isCustomText
//             );
//           } else if (key === "original") {
//             processedBuffer = imageBuffer;
//           } else {
//             const targetResolution = resolutions[key];
//             processedBuffer = await convertToTargetSizeAndResolution(
//               imageBuffer,
//               targetResolution,
//               metadata
//             );
//           }

//           const upload = new Upload({
//             client: s3,
//             params: {
//               Bucket: process.env.AWS_BUCKET,
//               Key: fileKey,
//               Body: processedBuffer,
//               ContentType: response.headers["content-type"],
//             },
//           });

//           await upload.done();

//           return {
//             key,
//             url: `https://${process.env.AWS_BUCKET}.s3.${config.region}.amazonaws.com/${fileKey}`,
//           };
//         }
//       );

//       const uploadResults = await Promise.all(uploadPromises);

//       const urls = uploadResults.reduce((acc, { key, url }) => {
//         acc[key] = url;
//         return acc;
//       }, {});

//       const returnedResolutions = { thumbnail: { width, height }, original: { width, height } };
//       if (imageSizeInMP > 12) {
//         returnedResolutions.medium = resolutions.medium;
//         returnedResolutions.small = resolutions.small;
//       } else if (imageSizeInMP > 4) {
//         returnedResolutions.small = resolutions.small;
//       }

//       res.send({ urls, resolutions: returnedResolutions });
//     } catch (error) {
//       console.error("Error processing image:", error);
//       res.status(500).send("Failed to upload image.");
//     }
//   }
// );


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
          watermarkBuffer = Buffer.from(response.data);
        }

        if (!royaltySettings || !royaltySettings.watermarkImage || !watermarkBuffer) {
          const { width, height } = await sharp(correctedImageBuffer).metadata();
          watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
        }
      } else if (plan === "intermediate" || (plan === "premium" && isCustomText)) {
        if (!customText) {
          return res.status(400).send("Custom text is required.");
        }
        const { width, height } = await sharp(correctedImageBuffer).metadata();
        watermarkBuffer = await createTextImageBuffer(customText, width, height);
      } else if (plan === "premium" && !isCustomText) {
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
          const watermarkWidth = Math.round(width * 0.1);
          const watermarkHeight = Math.round(height * 0.1);

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
          const fileName = `${Date.now()}_${Math.round(
            Math.random() * 1e9
          )}_${key}_${req.body.imageUrl.split("/").pop()}`;
          const fileKey = `images/${fileName}`;

          let processedBuffer;
          if (key === "thumbnail") {
            processedBuffer = await addWatermark(
              correctedImageBuffer,
              metadata,
              plan === "premium" && !isCustomText
            );
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
              ContentType: response.headers["content-type"],
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



 
 



module.exports = router