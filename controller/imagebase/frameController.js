const Frame = require("../../models/imagebase/frameModel");
const asyncHandler = require("express-async-handler");
const ImageVault = require("../../models/imagebase/imageVaultModel");
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
  const {
    name,
    image,
    material,
    style,
    thickness,
    initialBasePrice,
    userDiscount = 0,
    photographerDiscount = 0,
    isActive,
    customDimensions,
  } = req.body;

  if (!initialBasePrice || initialBasePrice <= 0) {
    res.status(400);
    throw new Error("Initial base price is required.");
  }

  const existingFrame = await Frame.findOne({ name });
  if (existingFrame) {
    res.status(400);
    throw new Error("Frame with this name already exists.");
  }

  const basePricePerLinearInch = Number(
    (initialBasePrice * (1 - userDiscount / 100)).toFixed(2)
  );

  const photographerFinalPrice = Number(
    (basePricePerLinearInch * (1 - photographerDiscount / 100)).toFixed(2)
  );

  const frame = await Frame.create({
    name,
    image,
    material,
    style,
    thickness,
    initialBasePrice,
    userDiscount,
    basePricePerLinearInch,
    photographerDiscount,
    photographerFinalPrice,
    isActive,
    customDimensions,
  });

  res.status(201).json({ frame });
});

const getFrames = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;
  const frames = await Frame.find({})
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  if (!frames || frames.length === 0) {
    return res.status(400).send({ message: "Frames not found" });
  }

  const totalDocuments = await Frame.countDocuments({});
  const pageCount = Math.ceil(totalDocuments / pageSize);
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
  const {
    id,
    name,
    image,
    material,
    style,
    thickness,
    initialBasePrice,
    userDiscount,
    photographerDiscount,
    isActive,
    customDimensions,
  } = req.body;

  const frame = await Frame.findById(id);
  if (!frame) {
    res.status(404);
    throw new Error("Frame not found.");
  }

  if (name !== undefined) frame.name = name;
  if (image !== undefined) frame.image = image;
  if (material !== undefined) frame.material = material;
  if (style !== undefined) frame.style = style;
  if (thickness !== undefined) frame.thickness = thickness;
  if (isActive !== undefined) frame.isActive = isActive;
  if (customDimensions !== undefined) frame.customDimensions = customDimensions;

  // old frames created before initialBasePrice existed
  if (frame.initialBasePrice === undefined && initialBasePrice === undefined) {
    frame.initialBasePrice = frame.basePricePerLinearInch;
  }

  if (initialBasePrice !== undefined) frame.initialBasePrice = initialBasePrice;

  if (userDiscount !== undefined) frame.userDiscount = userDiscount;

  if (photographerDiscount !== undefined)
    frame.photographerDiscount = photographerDiscount;

  const baseAfterUserDiscount =
    frame.initialBasePrice * (1 - (frame.userDiscount || 0) / 100);

  frame.basePricePerLinearInch = Number(baseAfterUserDiscount.toFixed(2));

  frame.photographerFinalPrice = Number(
    (
      frame.basePricePerLinearInch *
      (1 - (frame.photographerDiscount || 0) / 100)
    ).toFixed(2)
  );

  const updatedFrame = await frame.save();
  res.status(200).json({ updatedFrame });
});

const deleteFrame = asyncHandler(async (req, res) => {
  const frame = await Frame.findById(req.query.id);
  if (!frame) {
    return res.status(404).json({ message: "Frame not found." });
  }

  if (Array.isArray(frame.image)) {
    for (const img of frame.image) {
      if (!img) continue;

      const fileName = img.split(".amazonaws.com/")[1];

      if (!fileName) continue;

      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: fileName,
        })
      );
    }
  }

  await Frame.findByIdAndDelete(req.query.id);

  res.status(200).json({ message: "Frame deleted successfully." });
});

const calculateFramePrices = asyncHandler(async (req, res) => {
  const { frameId, imageId } = req.query;
  console.log(frameId, imageId);

  if (!frameId || !imageId) {
    res.status(400);
    throw new Error("Frame ID and Image ID are required.");
  }

  const frame = await Frame.findById(frameId);
  if (!frame || !frame.isActive) {
    res.status(404);
    throw new Error("Frame not found or is inactive.");
  }

  const image = await ImageVault.findById(imageId);

  if (!image || !image.resolutions) {
    res.status(404);
    throw new Error("Image not found or resolutions missing.");
  }

  const dpi = 300;

  const calculatePriceForResolution = (widthPixels, heightPixels, dpi) => {
    const widthInches = widthPixels / dpi;
    const heightInches = heightPixels / dpi;

    const perimeterInches = 2 * (widthInches + heightInches);

    return (
      Math.round(frame.basePricePerLinearInch * perimeterInches * 100) / 100
    );
  };

  const prices = {};
  for (const [key, resolution] of Object.entries(image.resolutions)) {
    if (resolution.width && resolution.height) {
      const widthInches = parseFloat((resolution.width / dpi).toFixed(2));
      const heightInches = parseFloat((resolution.height / dpi).toFixed(2));

      const price = calculatePriceForResolution(
        resolution.width,
        resolution.height,
        dpi
      );
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
    message: "Frame prices calculated successfully for all resolutions.",
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

const getAllInactiveFrames = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;
  const frames = await Frame.find({ active: false })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  if (!frames || frames.length === 0) {
    return res.status(400).send({ message: "Frames not found" });
  }

  const totalDocuments = await Frame.countDocuments({ active: false });
  const pageCount = Math.ceil(totalDocuments / pageSize);
  res.status(200).json({ frames, pageCount });
});

const getAllActiveFrames = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;
  const frames = await Frame.find({ active: true })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize);

  if (!frames || frames.length === 0) {
    return res.status(400).send({ message: "Frames not found" });
  }

  const totalDocuments = await Frame.countDocuments({ active: true });
  const pageCount = Math.ceil(totalDocuments / pageSize);
  res.status(200).json({ frames, pageCount });
});

const updateFrameStatus = asyncHandler(async (req, res) => {
  const { frameId, status = true } = req.body;

  if (!frameId) {
    return res.status(400).send({ message: "Frame Id is required" });
  }

  await Frame.findOneAndUpdate({ _id: frameId }, { active: status });

  res.status(200).send({ message: "Status Updated successfully" });
});

module.exports = {
  createFrame,
  getFrames,
  getAllActiveFrames,
  getFrameById,
  updateFrame,
  deleteFrame,
  calculateFramePrices,
  getAllInactiveFrames,
  updateFrameStatus,
};
