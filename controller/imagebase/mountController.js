const Mount = require("../../models/imagebase/mountModel");
const asyncHandler = require("express-async-handler");

const createMount = asyncHandler(async (req, res) => {
  const {
    color,
    thickness,
    initialBasePrice,
    userDiscount = 0,
    photographerDiscount = 0,
    isActive,
  } = req.body;

  console.log("color", color)
  console.log("thickness", thickness)

  if (!thickness || thickness <= 0) {
    res.status(400);
    throw new Error("Thickness is required and must be greater than 0.");
  }

  if (!initialBasePrice || initialBasePrice <= 0) {
    res.status(400);
    throw new Error("Initial base price is required.");
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
    userDiscount,
    basePricePerUnit,
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

  const basePricePerUnit =
    initialBasePrice || mount.initialBasePrice
      ? Number(
          (
            (initialBasePrice || mount.initialBasePrice) *
            (1 - (userDiscount || mount.userDiscount) / 100)
          ).toFixed(2)
        )
      : mount.basePricePerUnit;

  const photographerFinalPrice =
    basePricePerUnit && (photographerDiscount || mount.photographerDiscount)
      ? Number(
          (
            basePricePerUnit *
            (1 - (photographerDiscount || mount.photographerDiscount) / 100)
          ).toFixed(2)
        )
      : mount.photographerFinalPrice;

  const updatedMount = await Mount.findByIdAndUpdate(
    id,
    {
      thickness: thickness || mount.thickness,
      color: color || mount.color,
      initialBasePrice: initialBasePrice || mount.initialBasePrice,
      basePricePerUnit,
      userDiscount: userDiscount !== undefined ? userDiscount : mount.userDiscount,
      photographerDiscount:
        photographerDiscount !== undefined
          ? photographerDiscount
          : mount.photographerDiscount,
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
};
