const Paper = require("../../models/imagebase/paperModel");
const asyncHandler = require("express-async-handler");
const ImageVault = require('../../models/imagebase/imageVaultModel');
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

const createPaper = asyncHandler(async (req, res) => {
  const { name, image, material, thickness, basePricePerSquareInch, customDimensions } = req.body;

  const existingPaper = await Paper.findOne({ name });
  if (existingPaper) {
    res.status(400);
    throw new Error("Paper with this name already exists.");
  }

  const paper = await Paper.create({
    name,
    image,
    material,
    thickness,
    basePricePerSquareInch,
    customDimensions
  });

  res.status(201).send({ paper });
});

const getPapers = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query;
  const papers = await Paper.find({}).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize);
  if (!papers || papers.length === 0) return res.status(400).send({ message: 'No Paper found' });

  const totalDocuments = await Paper.countDocuments({});
  const pageCount = Math.ceil(totalDocuments / pageSize);

  res.status(200).json({ papers, pageCount });
});

const getPaperById = asyncHandler(async (req, res) => {
  const { paperId } = req.query
  const paper = await Paper.findById(paperId);
  if (!paper) {
    return res.status(404).send({ message: 'Paper not found' });
  }
  res.status(200).json({ paper });
});

const updatePaper = asyncHandler(async (req, res) => {
  const { paperId, name, image, material, thickness, basePricePerSquareInch, customDimensions } = req.body;

  const paper = await Paper.findById(paperId);
  if (!paper) {
    return res.status(404).send({ message: 'Paper not found' });
  }

  paper.name = name || paper.name;
  paper.image = image || paper.image;
  paper.material = material || paper.material;
  paper.thickness = thickness || paper.thickness;
  paper.basePricePerSquareInch = basePricePerSquareInch || paper.basePricePerSquareInch;
  if (customDimensions) {
    paper.customDimensions = customDimensions;
  }
  const updatedPaper = await paper.save();
  res.status(200).json({paper: updatedPaper});
})

const deletePaper = asyncHandler(async (req, res) => {
  const { paperId } = req.query
  
  const paper = await Paper.findById(paperId);
  if (!paper) {
    return res.status(404).send({ message: 'Paper not found' });
  }

  const imageUrl = paper?.image || undefined;
  if (imageUrl) {
    const fileName = imageUrl.split("//")[1].split("/")[1];

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: fileName,
    });
    await s3.send(command);
  }

  await Paper.findByIdAndDelete(paperId);
  res.status(200).json({ message: "Paper deleted successfully." });
});

const calculatePaperPrices = asyncHandler(async (req, res) => {
  const { paperId, imageId } = req.query;

  if (!paperId || !imageId) {
    res.status(400);
    throw new Error('Paper ID and Image ID are required.');
  }

  const paper = await Paper.findById(paperId);
  if (!paper) {
    res.status(404);
    throw new Error('Paper not found or is inactive.');
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
    const areaInSquareInches = widthInches * heightInches;
    const rawPrice = paper.basePricePerSquareInch * areaInSquareInches;
    return Math.round(rawPrice * 100) / 100;
  };

  const prices = {};
  for (const [key, resolution] of Object.entries(image.resolutions)) {
    if (resolution.width && resolution.height) {
      const price = calculatePriceForResolution(resolution.width, resolution.height, dpi);
      prices[key] = {
        size: {
          width: parseFloat((resolution.width / dpi).toFixed(2)),
          height: parseFloat((resolution.height / dpi).toFixed(2)),
        },
        price,
      };
    }
  }

  const customPrices = paper.customDimensions.map((dimension) => ({
    size: {
      width: dimension.width,
      height: dimension.height,
    },
    price: dimension.price,
  }));

  res.status(200).json({
    message: 'Paper prices calculated successfully for all resolutions.',
    data: {
      paperId: paper._id,
      imageId: image._id,
      pricing: {
        resolutions: prices,
        customDimensions: customPrices,
      },
    },
  });
})

module.exports = {
  createPaper,
  getPapers,
  getPaperById,
  updatePaper,
  deletePaper,
  calculatePaperPrices
}
