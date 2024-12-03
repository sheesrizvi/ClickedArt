const Canvas = require("../../models/imagebase/canvasModel");
const asyncHandler = require("express-async-handler");
const ImageVault = require('../../models/imagebase/imageVaultModel')

const createCanvas = asyncHandler(async (req, res) => {
  const { name, material, thickness, basePricePerSquareInch, isActive, customDimensions  } = req.body;

  const existingCanvas = await Canvas.findOne({ name });
  if (existingCanvas) {
    res.status(400);
    throw new Error("Canvas with this name already exists.");
  }

  const canvas = await Canvas.create({
    name,
    material,
    thickness,
    basePricePerSquareInch,
    isActive,
    customDimensions
  });

  res.status(201).json(canvas);
});


const getCanvases = asyncHandler(async (req, res) => {
  const { pageNumber = 1, pageSize = 20 } = req.query
  const canvases = await Canvas.find({}).sort({createdAt: -1}).skip((pageNumber -1) * pageSize).limit(pageSize)
  if(!canvases || canvases.length === 0) return res.status(400).send({ message: 'No Canvas found' })

  const totalDocuments = await Canvas.countDocuments({})
  const pageCount = Math.ceil(totalDocuments/pageSize)

  res.status(200).json({canvases, pageCount});
});


const getCanvasById = asyncHandler(async (req, res) => {
  const canvas = await Canvas.findById(req.query.id);
  if (!canvas) {
    return res.status(404).send({ message: 'Canvas not found' })
  }
  res.status(200).json({canvas})
});


const updateCanvas = asyncHandler(async (req, res) => {
  const { id, name, material, thickness, basePricePerSquareInch, isActive, customDimensions } = req.body;

  const canvas = await Canvas.findById(id);
  if (!canvas) {
    return res.status(404).send({ message: 'Canvas not found' })
  }

  canvas.name = name || canvas.name;
  canvas.material = material || canvas.material;
  canvas.thickness = thickness || canvas.thickness;
  canvas.basePricePerSquareInch = basePricePerSquareInch || canvas.basePricePerSquareInch;
  canvas.isActive = isActive !== undefined ? isActive : canvas.isActive;
  if (customDimensions) {
    canvas.customDimensions = [...canvas.customDimensions, ...customDimensions];
  }
  const updatedCanvas = await canvas.save();
  res.status(200).json(updatedCanvas);
});


const deleteCanvas = asyncHandler(async (req, res) => {
  const canvas = await Canvas.findById(req.query.id);
  if (!canvas) {
    return res.status(404).send({ message: 'Canvas not found' })
  }

  await Canvas.findByIdAndDelete(req.query.id);
  res.status(200).json({ message: "Canvas deleted successfully." });
});

const calculateCanvasPrices = asyncHandler(async (req, res) => {
  const { canvasId, imageId } = req.query;

  if (!canvasId || !imageId) {
    res.status(400);
    throw new Error('Canvas ID and Image ID are required.');
  }

  const canvas = await Canvas.findById(canvasId);
  if (!canvas || !canvas.isActive) {
    res.status(404);
    throw new Error('Canvas not found or is inactive.');
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
    const rawPrice = canvas.basePricePerSquareInch * areaInSquareInches; 
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

  const customPrices = canvas.customDimensions.map((dimension) => ({
    size: {
      width: dimension.width,
      height: dimension.height,
    },
    price: dimension.price,
  }));

  res.status(200).json({
    message: 'Canvas prices calculated successfully for all resolutions.',
    data: {
      canvasId: canvas._id,
      imageId: image._id,
      pricing: {
        resolutions: prices, 
        customDimensions: customPrices, 
      },
    },
  });
});






module.exports = {
  createCanvas,
  getCanvases,
  getCanvasById,
  updateCanvas,
  deleteCanvas,
  calculateCanvasPrices
};
