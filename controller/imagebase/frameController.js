const Frame = require("../../models/imagebase/frameModel");
const asyncHandler = require("express-async-handler");
const ImageVault = require('../../models/imagebase/imageVaultModel')
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { S3Client } = require("@aws-sdk/client-s3");

const config = {
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
};
const s3 = new S3Client(config);


const createFrame = asyncHandler(async (req, res) => {
  const { name, image, material, style, thickness, basePricePerLinearInch, isActive, customDimensions   } = req.body;

  const existingFrame = await Frame.findOne({ name });
  if (existingFrame) {
    res.status(400);
    throw new Error("Frame with this name already exists.");
  }

  const frame = await Frame.create({
    name,
    image,
    material,
    style,
    thickness,
    basePricePerLinearInch,
    isActive,
  });

  res.status(201).json({ frame });
});


const getFrames = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query
  const frames = await Frame.find({}).skip((pageNumber - 1) * pageSize).limit(pageSize)

  if(!frames || frames.length === 0) {
    return res.status(400).send({ message: 'Frames not found' })
  }

  const totalDocuments = await Frame.countDocuments({})
  const pageCount = Math.ceil(totalDocuments/pageSize)
  res.status(200).json({ frames, pageCount });
});


const getFrameById = asyncHandler(async (req, res) => {
  const frame = await Frame.findById(req.query.id);
  if (!frame) {
    res.status(404);
    throw new Error("Frame not found.");
  }
  res.status(200).json({ frame });
});


const updateFrame = asyncHandler(async (req, res) => {
  const { id, name, image, material, style, thickness, basePricePerLinearInch, isActive, customDimensions } = req.body;

  const frame = await Frame.findById(id);
  if (!frame) {
    res.status(404);
    throw new Error("Frame not found.");
  }

  frame.name = name || frame.name;
  frame.image = image || frame.image
  frame.material = material || frame.material;
  frame.style = style || frame.style;
  frame.thickness = thickness || frame.thickness;
  frame.basePricePerLinearInch = basePricePerLinearInch || frame.basePricePerLinearInch;
  frame.isActive = isActive !== undefined ? isActive : frame.isActive;
  if (customDimensions) {
    frame.customDimensions = customDimensions
  }
  
  const updatedFrame = await frame.save();
  res.status(200).json({updatedFrame});
});


const deleteFrame = asyncHandler(async (req, res) => {
  const frame = await Frame.findById(req.query.id);
  if (!frame) {
    res.status(404);
    throw new Error("Frame not found.");
  }

    f1 = frame?.image || undefined
    if (f1) {
        const fileName = f1.split("//")[1].split("/")[1];

        const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: fileName,
        });
        const response = await s3.send(command);
    }

  await Frame.findByIdAndDelete(req.query.id);
  res.status(200).json({ message: "Frame deleted successfully." });
});


const calculateFramePrices = asyncHandler(async (req, res) => {
  const { frameId, imageId } = req.query;
  console.log(frameId, imageId);

  if (!frameId || !imageId) {
    res.status(400);
    throw new Error('Frame ID and Image ID are required.');
  }

  const frame = await Frame.findById(frameId);
  if (!frame || !frame.isActive) {
    res.status(404);
    throw new Error('Frame not found or is inactive.');
  }

  const image = await ImageVault.findById(imageId);

  if (!image || !image.resolutions) {
    res.status(404);
    throw new Error('Image not found or resolutions missing.');
  }

  const dpi = 300;

  const calculatePriceForResolution = (widthPixels, heightPixels, dpi) => {
    const widthInches = widthPixels / dpi;
    const heightInches = heightPixels / dpi;

   
    const perimeterInches = 2 * (widthInches + heightInches);

   
    return Math.round(frame.basePricePerLinearInch * perimeterInches * 100) / 100;
  };

 
  const prices = {};
  for (const [key, resolution] of Object.entries(image.resolutions)) {
    if (resolution.width && resolution.height) {
      const widthInches = parseFloat((resolution.width / dpi).toFixed(2));
      const heightInches = parseFloat((resolution.height / dpi).toFixed(2));

      const price = calculatePriceForResolution(resolution.width, resolution.height, dpi);
      prices[key] = {
        size: {
          width: widthInches,
          height: heightInches,
        },
        price,
      };
    }
  }


  const customPrices = frame.customDimensions.map((dimension) => ({
    size: {
      width: dimension.width,
      height: dimension.height,
    },
    price: dimension.price,
  }));

  res.status(200).json({
    message: 'Frame prices calculated successfully for all resolutions.',
    data: {
      frameId: frame._id,
      imageId: image._id,
      pricing: {
        resolutions: prices,
        customDimensions: customPrices,
      },
    },
  });
});





module.exports = {
  createFrame,
  getFrames,
  getFrameById,
  updateFrame,
  deleteFrame,
  calculateFramePrices
};
