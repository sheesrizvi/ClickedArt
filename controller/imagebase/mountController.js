const Mount = require("../../models/imagebase/mountModel");
const asyncHandler = require("express-async-handler");
const { getAvailableMounts, getAllowedMountOptions } = require("../../utils/mountValidator");

const createMount = asyncHandler(async (req, res) => {
  const {
    color,
    thickness,
    initialBasePrice,
    userDiscount = 0,
    photographerDiscount = 0,
    isActive = true,
  } = req.body;

  console.log("color", color)
  console.log("thickness", thickness)

  if (!thickness || thickness <= 0) {
    res.status(400);
    throw new Error("Thickness is required and must be greater than 0.");
  }

  if (!color) {
    res.status(400);
    throw new Error("Color code is required.");
  }

  if (!initialBasePrice || initialBasePrice <= 0) {
    res.status(400);
    throw new Error("Initial base price is required and must be greater than 0.");
  }

  const basePricePerUnit = Number(
    (initialBasePrice * (1 - userDiscount / 100)).toFixed(2)
  );

  const photographerFinalPrice = Number(
    (basePricePerUnit * (1 - photographerDiscount / 100)).toFixed(2)
  );

  const mount = await Mount.create({
    thickness,
    color,
    initialBasePrice,
    basePricePerUnit,
    basePricePerLinearInch: basePricePerUnit,
    userDiscount,
    photographerDiscount,
    photographerFinalPrice,
    isActive,
  });

  res.status(201).json({ mount });
});

const getMount = asyncHandler(async (req, res) => {
  const mounts = await Mount.find({});

  res.status(200).json({ mounts: mounts || [] });
});

const getMountById = asyncHandler(async (req, res) => {
  const mount = await Mount.findById(req.query.id);
  if (!mount) {
    res.status(404);
    throw new Error("Mount not found.");
  }
  res.status(200).json({ mount });
});

const updateMount = asyncHandler(async (req, res) => {
  const {
    id,
    color,
    thickness,
    initialBasePrice,
    userDiscount,
    photographerDiscount,
    isActive,
  } = req.body;

  if (!id) {
    res.status(400);
    throw new Error("Mount ID is required.");
  }

  const mount = await Mount.findById(id);
  if (!mount) {
    res.status(404);
    throw new Error("Mount not found.");
  }

  if (thickness !== undefined && (typeof thickness !== 'number' || thickness <= 0)) {
    res.status(400);
    throw new Error("Thickness must be a number greater than 0.");
  }

  if (initialBasePrice !== undefined && (typeof initialBasePrice !== 'number' || initialBasePrice <= 0)) {
    res.status(400);
    throw new Error("Initial base price must be a number greater than 0.");
  }

  const basePricePerUnit =
    initialBasePrice !== undefined || mount.initialBasePrice
      ? Number(
          (
            (initialBasePrice !== undefined ? initialBasePrice : mount.initialBasePrice) *
            (1 - (userDiscount !== undefined ? userDiscount : mount.userDiscount) / 100)
          ).toFixed(2)
        )
      : mount.basePricePerUnit;

  const photographerFinalPrice =
    basePricePerUnit && (photographerDiscount !== undefined ? photographerDiscount : mount.photographerDiscount) !== undefined
      ? Number(
          (
            basePricePerUnit *
            (1 - (photographerDiscount !== undefined ? photographerDiscount : mount.photographerDiscount) / 100)
          ).toFixed(2)
        )
      : mount.photographerFinalPrice;

  const updatedMount = await Mount.findByIdAndUpdate(
    id,
    {
      thickness: thickness !== undefined ? thickness : mount.thickness,
      color: color !== undefined ? color : mount.color,
      initialBasePrice: initialBasePrice !== undefined ? initialBasePrice : mount.initialBasePrice,
      basePricePerUnit,
      basePricePerLinearInch: basePricePerUnit,
      userDiscount: userDiscount !== undefined ? userDiscount : mount.userDiscount,
      photographerDiscount: photographerDiscount !== undefined ? photographerDiscount : mount.photographerDiscount,
      photographerFinalPrice,
      isActive: isActive !== undefined ? isActive : mount.isActive,
    },
    { new: true }
  );

  res.status(200).json({ updatedMount });
});

const deleteMount = asyncHandler(async (req, res) => {
  const { id } = req.query;

  if (!id) {
    res.status(400);
    throw new Error("Mount ID is required.");
  }

  const mount = await Mount.findByIdAndDelete(id);
  if (!mount) {
    res.status(404);
    throw new Error("Mount not found.");
  }

  res.status(200).json({ message: "Mount deleted successfully", mount });
});


const getAllInactiveMount = asyncHandler(async (req, res) => {
  const mounts = await Mount.find({ isActive: false });

  res.status(200).json({ mounts: mounts || [] });
});

const getAllActiveMount = asyncHandler(async (req, res) => {
  const mounts = await Mount.find({ isActive: true });

  res.status(200).json({ mounts: mounts || [] });
});

const updateMountStatus = asyncHandler(async (req, res) => {
  const { id, isActive } = req.body;

  if (!id) {
    res.status(400);
    throw new Error("Mount ID is required.");
  }

  const mount = await Mount.findByIdAndUpdate(
    id,
    { isActive },
    { new: true }
  );

  if (!mount) {
    res.status(404);
    throw new Error("Mount not found.");
  }

  res.status(200).json({ mount });
});

const getAllowedOptions = asyncHandler(async (req, res) => {
  const { width, height } = req.query;

  if (!width || !height) {
    res.status(400);
    throw new Error("Width and height are required");
  }

  // Fetch active mounts to determine what thicknesses are actually available
  const activeMounts = await Mount.find({ isActive: true });

  const allowedMounts = getAllowedMountOptions(
    parseFloat(width),
    parseFloat(height),
    activeMounts
  );

  res.status(200).json({
    success: true,
    allowedMounts,
    dimensions: { width: parseFloat(width), height: parseFloat(height) }
  });
});

const validateSize = asyncHandler(async (req, res) => {
  const { mountSize, width, height } = req.body;

  if (mountSize === undefined || !width || !height) {
    res.status(400);
    throw new Error("mountSize, width, and height are required");
  }

  const activeMounts = await Mount.find({ isActive: true });
  const allowedMounts = getAllowedMountOptions(
    parseFloat(width),
    parseFloat(height),
    activeMounts
  );
  const isValid = allowedMounts.includes(String(mountSize));

  res.status(200).json({
    success: true,
    isValid,
    allowedMounts,
    mountSize,
    dimensions: { width: parseFloat(width), height: parseFloat(height) },
    reason: isValid
      ? `${mountSize} inch mount is allowed for ${width}x${height} inches`
      : `${mountSize} inch mount is NOT allowed for ${width}x${height} inches. Allowed: ${allowedMounts.join(", ")}`
  });
});

const getConfiguration = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    configuration: {
      constraints: {
        allMounts: { maxWidth: 39, maxHeight: 39, minWidth: 12, minHeight: 12 },
        noMountOnly: { maxWidth: 29, maxHeight: 29 },
        upTo1Inch: { maxWidth: 28, maxHeight: 38 },
        upTo1_5Inch: { maxWidth: 27, maxHeight: 37 }
      },
      description: "These constraints determine which mount sizes are available for different print dimensions"
    }
  });
});

const calculateMountPrices = asyncHandler(async (req, res) => {
  const { initialBasePrice, userDiscount = 0, photographerDiscount = 0 } =
    req.query;

  if (!initialBasePrice) {
    res.status(400);
    throw new Error("Initial base price is required.");
  }

  const basePricePerUnit = Number(
    (initialBasePrice * (1 - userDiscount / 100)).toFixed(2)
  );

  const photographerFinalPrice = Number(
    (basePricePerUnit * (1 - photographerDiscount / 100)).toFixed(2)
  );

  res.status(200).json({
    initialBasePrice: Number(initialBasePrice),
    userDiscount: Number(userDiscount),
    basePricePerUnit,
    photographerDiscount: Number(photographerDiscount),
    photographerFinalPrice,
  });
});

module.exports = {
  createMount,
  getMount,
  getMountById,
  updateMount,
  deleteMount,
  calculateMountPrices,
  getAllInactiveMount,
  getAllActiveMount,
  updateMountStatus,
  getAllowedOptions,
  validateSize,
  getConfiguration,
};
