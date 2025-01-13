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



// // this is working
// router.post(
//   "/handle-photos-with-watermark-and-resolutions-options",
//   upload1.single("image"),
//   async (req, res) => {
//     try {

//       // if (!req.file) {
//       //   return res.status(400).send("No file uploaded.");
//       // }

//       const plan = req.body.plan;
//       const isCustomText = req.body.isCustomText === "true"; 
//       const customText = req.body.customText;
//       const imageUrl = req.body.imageUrl;
      
//       const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
//       imageBuffer = Buffer.from(response.data);
      
//       let watermarkBuffer;

//       if (plan === "basic") {
//         const royaltySettings = await RoyaltySettings.findOne();
//         if (!royaltySettings || !royaltySettings.watermarkImage) {
//           return res.status(400).send("Watermark image not found for Basic plan.");
//         }
//         // const watermarkUrl = royaltySettings.watermarkImage;
//         // const watermarkResponse = await axios.get(watermarkUrl, { responseType: "arraybuffer" });
//         // watermarkBuffer = Buffer.from(watermarkResponse.data);
       
//         const { width, height } = await sharp(imageBuffer).metadata();
//         watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
        
//       } else if (plan === "intermediate" || (plan === "advanced" && isCustomText)) {
//         if (!customText) {
//           return res.status(400).send("Custom text is required.");
//         }
//         const { width, height } = await sharp(imageBuffer).metadata();
//         watermarkBuffer = await createTextImageBuffer(customText, width, height);
//       } else if (plan === "advanced" && !isCustomText) {
//         const customWatermark = await CustomWatermark.findOne({ photographer: req.body.photographer });
//         if (!customWatermark || !customWatermark.watermarkImage) {
//           return res.status(400).send("Custom watermark image not found.");
//         }
//         const watermarkUrl = customWatermark.watermarkImage;
//         const watermarkResponse = await axios.get(watermarkUrl, { responseType: "arraybuffer" });

//         originalWatermarkBuffer  = Buffer.from(watermarkResponse.data);
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

   
      
//       const convertToTargetSizeAndResolution = async (buffer, targetSize, targetResolution, format) => {
//         const { width, height } = await sharp(buffer).metadata();
//         const isCustomImage = plan === "advanced" && !isCustomText;

//         let processedBuffer = await addWatermark(buffer, width, height, isCustomImage);

//         processedBuffer = await sharp(processedBuffer)
//           .resize(targetResolution.width, targetResolution.height)
//           .toBuffer();

//         if (format === "jpeg" || format === "jpg") {
//           let quality = 90;
//           while (true) {
//             processedBuffer = await sharp(processedBuffer)
//               .jpeg({ quality })
//               .toBuffer();

//             if (processedBuffer.length <= targetSize || quality <= 10) {
//               break;
//             }
//             quality -= 5;
//           }
//         } else if (format === "png") {
//           processedBuffer = await sharp(processedBuffer)
//             .png({ compressionLevel: 9, quality: 100 })
//             .toBuffer();
//         } else if (format === "webp") {
//           let quality = 90;
//           while (true) {
//             processedBuffer = await sharp(processedBuffer)
//               .webp({ quality })
//               .toBuffer();

//             if (processedBuffer.length <= targetSize || quality <= 10) {
//               break;
//             }
//             quality -= 5;
//           }
//         } else {
//           processedBuffer = await sharp(processedBuffer)
//             .jpeg({ quality: 85 })
//             .toBuffer();
//         }

//         return processedBuffer;
//       };

//       const { width, height, format } = await sharp(imageBuffer).metadata();
//       const imageSizeInMB = imageBuffer.length / (1024 * 1024);

//       const sizeTargets = {
//         small: 2.6 * 1024 * 1024, // 2.6 MB
//         medium: 8.8 * 1024 * 1024, // 8.8 MB
//       };

//       const resolutions = {
//         small: {
//           width: Math.round(width * 0.6),
//           height: Math.round(height * 0.6),
//         },
//         medium: {
//           width: Math.round(width * 0.75),
//           height: Math.round(height * 0.75),
//         },
//       };

//       const conversionTargets =
//       imageSizeInMB > 10
//           ? ["small", "medium"]
//           : imageSizeInMB > 4
//           ? ["small"]
//           : [];

//       const uploadPromises = ["original", ...conversionTargets].map(async (key) => {
//         const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${req.file.originalname}`;
//         const fileKey = `images/${fileName}`;

//         let processedBuffer;
//         if (key === "original") {
//           processedBuffer = await addWatermark(imageBuffer, width, height, plan === "advanced" && !isCustomText);
//         } else {
//           const targetResolution = resolutions[key];
//           const targetSize = sizeTargets[key];
//           processedBuffer = await convertToTargetSizeAndResolution(
//             imageBuffer,
//             targetSize,
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
//             ContentType: req.file.mimetype,
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

//       const returnedResolutions = { original: { width, height } };
//       if (fileSizeInMB > 10) {
//         returnedResolutions.medium = resolutions.medium;
//         returnedResolutions.small = resolutions.small;
//       } else if (fileSizeInMB > 4) {
//         returnedResolutions.small = resolutions.small;
//       }

//       res.send({ urls, resolutions: returnedResolutions });
//     } catch (error) {
//       console.error("Error processing image:", error);
//       res.status(500).send("Failed to upload image.");
//     }
//   }
// );


// new secondary for testing
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
//         if (!royaltySettings || !royaltySettings.watermarkImage) {
//           return res.status(400).send("Watermark image not found for Basic plan.");
//         }

//         const { width, height } = await sharp(imageBuffer).metadata();
//         watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
//       } else if (plan === "intermediate" || (plan === "advanced" && isCustomText)) {
//         if (!customText) {
//           return res.status(400).send("Custom text is required.");
//         }
//         const { width, height } = await sharp(imageBuffer).metadata();
//         watermarkBuffer = await createTextImageBuffer(customText, width, height);
//       } else if (plan === "advanced" && !isCustomText) {
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

//       const convertToTargetSizeAndResolution = async (buffer, targetSize, targetResolution, format) => {
//         const { width, height } = await sharp(buffer).metadata();
//         const isCustomImage = plan === "advanced" && !isCustomText;

//         let processedBuffer = await addWatermark(buffer, width, height, isCustomImage);

//         processedBuffer = await sharp(processedBuffer)
//           .resize(targetResolution.width, targetResolution.height)
//           .toBuffer();

//         if (format === "jpeg" || format === "jpg") {
//           let quality = 90;
//           while (true) {
//             processedBuffer = await sharp(processedBuffer)
//               .jpeg({ quality })
//               .toBuffer();

//             if (processedBuffer.length <= targetSize || quality <= 10) {
//               break;
//             }
//             quality -= 5;
//           }
//         } else if (format === "png") {
//           processedBuffer = await sharp(processedBuffer)
//             .png({ compressionLevel: 9, quality: 100 })
//             .toBuffer();
//         } else if (format === "webp") {
//           let quality = 90;
//           while (true) {
//             processedBuffer = await sharp(processedBuffer)
//               .webp({ quality })
//               .toBuffer();

//             if (processedBuffer.length <= targetSize || quality <= 10) {
//               break;
//             }
//             quality -= 5;
//           }
//         } else {
//           processedBuffer = await sharp(processedBuffer)
//             .jpeg({ quality: 85 })
//             .toBuffer();
//         }

//         return processedBuffer;
//       };

//       const { width, height, format } = await sharp(imageBuffer).metadata();
//       const imageSizeInMB = imageBuffer.length / (1024 * 1024);

//       const sizeTargets = {
//         small: 2.6 * 1024 * 1024, // 2.6 MB
//         medium: 8.8 * 1024 * 1024, // 8.8 MB
//       };

//       const resolutions = {
//         small: {
//           width: Math.round(width * 0.6),
//           height: Math.round(height * 0.6),
//         },
//         medium: {
//           width: Math.round(width * 0.75),
//           height: Math.round(height * 0.75),
//         },
//       };

//       const conversionTargets =
//         imageSizeInMB > 10
//           ? ["small", "medium"]
//           : imageSizeInMB > 4
//           ? ["small"]
//           : [];

//       const uploadPromises = ["original", ...conversionTargets].map(async (key) => {
//         const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${req.body.imageUrl.split("/").pop()}`;
//         const fileKey = `images/${fileName}`;

//         let processedBuffer;
//         if (key === "original") {
//           processedBuffer = await addWatermark(imageBuffer, width, height, plan === "advanced" && !isCustomText);
//         } else {
//           const targetResolution = resolutions[key];
//           const targetSize = sizeTargets[key];
//           processedBuffer = await convertToTargetSizeAndResolution(
//             imageBuffer,
//             targetSize,
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

//       const returnedResolutions = { original: { width, height } };
//       if (imageSizeInMB > 10) {
//         returnedResolutions.medium = resolutions.medium;
//         returnedResolutions.small = resolutions.small;
//       } else if (imageSizeInMB > 4) {
//         returnedResolutions.small = resolutions.small;
//       }

//       res.send({ urls, resolutions: returnedResolutions });
//     } catch (error) {
//       console.error("Error processing image:", error);
//       res.status(500).send("Failed to upload image.");
//     }
//   }
// );



// new third route for testing

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
//         if (!royaltySettings || !royaltySettings.watermarkImage) {
//           return res.status(400).send("Watermark image not found for Basic plan.");
//         }

//         const { width, height } = await sharp(imageBuffer).metadata();
//         watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
//       } else if (plan === "intermediate" || (plan === "advanced" && isCustomText)) {
//         if (!customText) {
//           return res.status(400).send("Custom text is required.");
//         }
//         const { width, height } = await sharp(imageBuffer).metadata();
//         watermarkBuffer = await createTextImageBuffer(customText, width, height);
//       } else if (plan === "advanced" && !isCustomText) {
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

//       const convertToTargetSizeAndResolution = async (buffer, targetSize, targetResolution, format) => {
//         let processedBuffer = await sharp(buffer)
//             .resize(targetResolution.width, targetResolution.height)
//             .toBuffer();
    
//         if (format === "jpeg" || format === "jpg") {
//             let quality = 90;
//             while (true) {
//                 processedBuffer = await sharp(processedBuffer)
//                     .jpeg({ quality })
//                     .toBuffer();
    
//                 if (processedBuffer.length <= targetSize || quality <= 10) {
//                     break;
//                 }
//                 quality -= 5;
//             }
//         } else if (format === "png") {
//             processedBuffer = await sharp(processedBuffer)
//                 .png({ compressionLevel: 9, quality: 100 })
//                 .toBuffer();
//         } else if (format === "webp") {
//             let quality = 90;
//             while (true) {
//                 processedBuffer = await sharp(processedBuffer)
//                     .webp({ quality })
//                     .toBuffer();
    
//                 if (processedBuffer.length <= targetSize || quality <= 10) {
//                     break;
//                 }
//                 quality -= 5;
//             }
//         } else {
//             processedBuffer = await sharp(processedBuffer)
//                 .jpeg({ quality: 85 })
//                 .toBuffer();
//         }
    
//         return processedBuffer;
//     };
    

//       const { width, height, format } = await sharp(imageBuffer).metadata();
//       const imageSizeInMB = imageBuffer.length / (1024 * 1024);

//       const sizeTargets = {
//         small: 2.6 * 1024 * 1024, // 2.6 MB
//         medium: 8.8 * 1024 * 1024, // 8.8 MB
//       };

//       const resolutions = {
//         small: {
//           width: Math.round(width * 0.6),
//           height: Math.round(height * 0.6),
//         },
//         medium: {
//           width: Math.round(width * 0.75),
//           height: Math.round(height * 0.75),
//         },
//       };

//       const conversionTargets =
//         imageSizeInMB > 10
//           ? ["small", "medium"]
//           : imageSizeInMB > 4
//           ? ["small"]
//           : [];

//       const uploadPromises = ["thumbnail", "original", ...conversionTargets].map(async (key) => {
//         const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${req.body.imageUrl.split("/").pop()}`;
//         const fileKey = `images/${fileName}`;

//         let processedBuffer;
//         if (key === "thumbnail") {
//           processedBuffer = await addWatermark(imageBuffer, width, height, plan === "advanced" && !isCustomText);
//         } else if (key === "original") {
//           processedBuffer = imageBuffer;
//         } else {
//           const targetResolution = resolutions[key];
//           const targetSize = sizeTargets[key];
//           processedBuffer = await convertToTargetSizeAndResolution(
//             imageBuffer,
//             targetSize,
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
//       if (imageSizeInMB > 10) {
//         returnedResolutions.medium = resolutions.medium;
//         returnedResolutions.small = resolutions.small;
//       } else if (imageSizeInMB > 4) {
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
//   try {
//     const rgbaImage = await sharp(buffer)
//       .ensureAlpha()  
//       .toBuffer();

   
//     const { data, info } = await sharp(rgbaImage)
//       .raw()
//       .toBuffer({ resolveWithObject: true });

//     for (let i = 0; i < data.length; i += info.channels) {
//       const r = data[i];     
//       const g = data[i + 1]; 
//       const b = data[i + 2]; 
//       const alpha = data[i + 3]; 
//       if (r > 180 && g > 180 && b > 180) {
//         data[i + 3] = 0; 
//       }
//     }

//     const transparentImage = await sharp(data, {
//       raw: {
//         width: info.width,
//         height: info.height,
//         channels: 4, 
//       },
//     })
//       .toFormat('png')
//       .toBuffer();

//     return transparentImage;
//   } catch (error) {
//     console.error("Error removing background aggressively with sharp:", error);
//     throw new Error("Failed to aggressively remove background from watermark image.");
//   }
// };


// handle fourth testing


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

      let watermarkBuffer;

      if (plan === "basic") {
        const royaltySettings = await RoyaltySettings.findOne();

        if(royaltySettings && royaltySettings.watermarkImage ) {
          const response = await axios.get(royaltySettings.watermarkImage, {
            responseType: 'arraybuffer'
          })
          watermarkBuffer = Buffer.from(response.data)
        }

        if(!royaltySettings || !royaltySettings.watermarkImage || !watermarkBuffer) {
          const { width, height } = await sharp(imageBuffer).metadata();
          watermarkBuffer = await createTextImageBuffer("ClickedArt", width, height);
        }
       
      } else if (plan === "intermediate" || (plan === "premium" && isCustomText)) {
        if (!customText) {
          return res.status(400).send("Custom text is required.");
        }
        const { width, height } = await sharp(imageBuffer).metadata();
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

      const addWatermark = async (buffer, width, height, isCustomImage = false) => {
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

      const convertToTargetSizeAndResolution = async (buffer, targetResolution, format) => {
        let processedBuffer = await sharp(buffer)
          .resize(targetResolution.width, targetResolution.height)
          .toBuffer();

        // if (format === "jpeg" || format === "jpg") {
        //   let quality = 90;
        //   while (true) {
        //     processedBuffer = await sharp(processedBuffer)
        //       .jpeg({ quality })
        //       .toBuffer();

        //     if (quality <= 10) {
        //       break;
        //     }
        //     quality -= 5;
        //   }
        // } else if (format === "png") {
        //   processedBuffer = await sharp(processedBuffer)
        //     .png({ compressionLevel: 9, quality: 100 })
        //     .toBuffer();
        // } else if (format === "webp") {
        //   let quality = 90;
        //   while (true) {
        //     processedBuffer = await sharp(processedBuffer)
        //       .webp({ quality })
        //       .toBuffer();

        //     if (quality <= 10) {
        //       break;
        //     }
        //     quality -= 5;
        //   }
        // } else {
        //   processedBuffer = await sharp(processedBuffer)
        //     .jpeg({ quality: 85 })
        //     .toBuffer();
        // }

        return processedBuffer;
      };

      const { width, height, format } = await sharp(imageBuffer).metadata();
      const imageSizeInMP = (width * height) / 1_000_000;
      console.log(`Original Image Size: ${imageSizeInMP.toFixed(2)} MP`);
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

      console.log(`Small Resolution: ${resolutions.small.width}x${resolutions.small.height} (${(resolutions.small.width * resolutions.small.height / 1_000_000).toFixed(2)} MP)`);
      console.log(`Medium Resolution: ${resolutions.medium.width}x${resolutions.medium.height} (${(resolutions.medium.width * resolutions.medium.height / 1_000_000).toFixed(2)} MP)`);

      const conversionTargets =
        imageSizeInMP > 12
          ? ["small", "medium"]
          : imageSizeInMP > 4
          ? ["small"]
          : [];

      const uploadPromises = ["thumbnail", "original", ...conversionTargets].map(async (key) => {
        const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${key}_${req.body.imageUrl.split("/").pop()}`;
        const fileKey = `images/${fileName}`;

        let processedBuffer;
        if (key === "thumbnail") {
          processedBuffer = await addWatermark(imageBuffer, width, height, plan === "premium" && !isCustomText);
        } else if (key === "original") {
          processedBuffer = imageBuffer;
        } else {
          const targetResolution = resolutions[key];
          processedBuffer = await convertToTargetSizeAndResolution(
            imageBuffer,
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
            ContentType: response.headers["content-type"],
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

      const returnedResolutions = { thumbnail: { width, height }, original: { width, height } };
      if (imageSizeInMP > 12) {
        returnedResolutions.medium = resolutions.medium;
        returnedResolutions.small = resolutions.small;
      } else if (imageSizeInMP > 4) {
        returnedResolutions.small = resolutions.small;
      }

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
      <text x="50%" y="50%" class="text" fill="rgba(255, 255, 255, 0.3)" font-family="'Brush Script MT', cursive" font-size="${Math.round(
        height * 0.07
      )}" text-anchor="middle" dominant-baseline="middle">${text}</text>
    </svg>
  `;
  return Buffer.from(svg);
};

const removeBackgroundWithSharp = async (buffer) => {
  return buffer
  // try {
  //   const rgbaImage = await sharp(buffer)
  //     .ensureAlpha()
  //     .toBuffer();

  //   const { data, info } = await sharp(rgbaImage)
  //     .raw()
  //     .toBuffer({ resolveWithObject: true });

  //   const transparentData = Buffer.from(data);

  //   for (let i = 0; i < transparentData.length; i += info.channels) {
  //     const r = transparentData[i];
  //     const g = transparentData[i + 1];
  //     const b = transparentData[i + 2];
  //     const a = transparentData[i + 3];

  //     if (r > 200 && g > 200 && b > 200) {
  //       transparentData[i + 3] = 0; 
  //     } else {
  //       transparentData[i + 3] = a; 
  //     }
  //   }

  //   return sharp(transparentData, {
  //     raw: {
  //       width: info.width,
  //       height: info.height,
  //       channels: info.channels,
  //     },
  //   })
  //     .toBuffer();
  // } catch (error) {
  //   console.error("Error in removeBackgroundWithSharp:", error);
  //   throw error;
  // }
};


module.exports = router