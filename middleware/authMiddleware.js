const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel.js");
const Photographer = require("../models/photographerModel.js");
const Admin = require("../models/adminModel.js");

const verifyToken = asyncHandler(async (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(403).send({
      status: false,
      message: "Token is required",
    });
  }
  const decoded = await jwt.verify(token, process.env.SECRET_KEY);
  req.user = decoded;
  next();
});

const getUserProfileByToken = asyncHandler(async (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(403).send({
      status: false,
      message: "Token is required",
    });
  }
  const decoded = await jwt.verify(token, process.env.SECRET_KEY);

  if (!decoded) {
    return res.status(400).send({ message: "No User found" });
  }

  const type = decoded?.type;
  const Model = type === "User" ? User : Photographer;
  const user = await Model.findOne({ _id: decoded?.id });
  if (type === "Photographer") {
    user.lastActive = new Date();
  }
  await user.save();

  res.status(200).send({ user });
});

const getAdminProfileByToken = asyncHandler(async (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(403).send({
      status: false,
      message: "Token is required",
    });
  }
  const decoded = await jwt.verify(token, process.env.SECRET_KEY);

  if (!decoded) {
    return res.status(400).send({ message: "No User found" });
  }

  const user = await Admin.findOne({ _id: decoded?.id });
  res.status(200).send({ admin: user });
});

const isAdmin = asyncHandler(async (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(403).send({
      status: false,
      message: "Token is required",
    });
  }

  const decoded = await jwt.verify(token, process.env.SECRET_KEY);

  if (
    decoded.type === "Admin" ||
    decoded.type === "admin" ||
    decoded.type === "finance" ||
    decoded.type === "seo" ||
    decoded.type === "print"
  ) {
    req.user = decoded;
    next();
  } else {
    throw new Error("Not an Admin!");
  }
});

const IsPhotographer = asyncHandler(async (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(403).send({
      status: false,
      message: "Token is required",
    });
  }

  const decoded = await jwt.verify(token, process.env.SECRET_KEY);
  if (decoded.type === "Photographer") {
    req.vendor = decoded;
    next();
  } else {
    throw new Error("Not an Photographer!");
  }
});

const IsAdminOrPhotographer = asyncHandler(async (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(403).send({
      status: false,
      message: "Token is required",
    });
  }

  const decoded = await jwt.verify(token, process.env.SECRET_KEY);
  if (
    decoded.type === "Admin" ||
    decoded.type === "Photographer" ||
    decoded.type === "admin" ||
    decoded.type === "finance" ||
    decoded.type === "seo" ||
    decoded.type === "print"
  ) {
    req.user = decoded;
    next();
  } else {
    throw new Error("Not an Admin or Photographer!");
  }
});

const isSuperAdmin = asyncHandler(async (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token) {
    return res.status(403).send({
      status: false,
      message: "Token is required",
    });
  }

  const decoded = await jwt.verify(token, process.env.SECRET_KEY);
  if (decoded.type === "Admin") {
    req.user = decoded;
    next();
  } else {
    throw new Error("Not an Super Admin!");
  }
});

module.exports = {
  verifyToken,
  isAdmin,
  IsPhotographer,
  IsAdminOrPhotographer,
  isSuperAdmin,
  getUserProfileByToken,
  getAdminProfileByToken,
};
