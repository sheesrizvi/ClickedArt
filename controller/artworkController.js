const Artwork = require("../models/artworkModel");
const Photographer = require("../models/photographerModel");
const Category = require("../models/artworkCategoryModel");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

// S3 Client
const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

// Helper: Upload buffer to S3
const uploadBufferToS3 = async (buffer, key, contentType) => {
  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };
  await s3.send(new PutObjectCommand(params));
  return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${key}`;
};

// Helper: Delete S3 object by URL
const deleteFromS3 = async (url) => {
  if (!url) return;
  const parts = url.split(".amazonaws.com/");
  if (parts[1]) {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: parts[1],
      })
    );
  }
};

// Helper: Generate slug
const generateSlug = (title) => {
  return (title || "artwork")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
};

/**
 * @desc    Upload a single artwork (photographer)
 * @route   POST /api/artworks/upload
 * @access  Protected (Photographer | Admin)
 */
const uploadArtwork = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;

  const isAdminUser = ["Admin", "admin", "seo", "finance", "print"].includes(req.user.type);
  // If admin, they can assign artwork to a specific photographer
  const effectiveUserId = (isAdminUser && req.body.photographerId) ? req.body.photographerId : userId;

  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded." });
  }

  const { title, description, medium, style, orientation, keywords, yearCreated, dimensionWidth, dimensionHeight, dimensionUnit, publishStatus, featureAll, categoryName, uploadSource } = req.body;

  // File size limit: 30MB
  if (req.file.size > 30 * 1024 * 1024) {
    return res.status(400).json({ success: false, message: "File exceeds 30MB limit." });
  }

  const filename = req.file.originalname;
  const autoTitle = title || filename.substring(0, filename.lastIndexOf(".")).replace(/[-_.]+/g, " ") || filename;

  // Duplicate detection in same user account
  const existing = await Artwork.findOne({
    user: effectiveUserId,
    title: autoTitle,
    fileSize: req.file.size,
  });
  if (existing) {
    return res.status(400).json({ success: false, message: `An artwork named "${autoTitle}" with the same file already exists.` });
  }

  const originalBuffer = req.file.buffer;
  const metadata = await sharp(originalBuffer).metadata();
  const { width, height } = metadata;
  const contentType = req.file.mimetype;
  const timestamp = Date.now();
  const baseKey = `artworks/${effectiveUserId}/${timestamp}`;

  // Process resolutions
  const [thumbBuffer, smallBuffer, medBuffer] = await Promise.all([
    sharp(originalBuffer).resize({ width: 300, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer(),
    sharp(originalBuffer).resize({ width: 800, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer(),
    sharp(originalBuffer).resize({ width: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
  ]);

  const [thumbMeta, smallMeta, medMeta] = await Promise.all([
    sharp(thumbBuffer).metadata(),
    sharp(smallBuffer).metadata(),
    sharp(medBuffer).metadata(),
  ]);

  // Upload all resolutions to S3
  const [originalUrl, thumbUrl, smallUrl, medUrl] = await Promise.all([
    uploadBufferToS3(originalBuffer, `${baseKey}_original.jpg`, contentType),
    uploadBufferToS3(thumbBuffer, `${baseKey}_thumb.jpg`, "image/jpeg"),
    uploadBufferToS3(smallBuffer, `${baseKey}_small.jpg`, "image/jpeg"),
    uploadBufferToS3(medBuffer, `${baseKey}_medium.jpg`, "image/jpeg"),
  ]);

  // Parse keywords
  const parsedKeywords = keywords
    ? (typeof keywords === "string" ? keywords.split(",") : keywords).map((k) => k.trim()).filter(Boolean)
    : ["artwork", "art"];

  // Build slug
  const slug = `${generateSlug(autoTitle)}-${timestamp}`;

  // Admin uploads: published = active & approved, draft = stored but not live
  const isDraft = isAdminUser && publishStatus === "draft";
  const isPublished = isAdminUser && !isDraft;
  const isFeatured = isAdminUser && (featureAll === "true" || featureAll === true);
  
  const source = uploadSource || (isAdminUser ? "admin" : "user");
  const initialApprovalStatus = (source === "user") ? "Pending" : (isPublished ? "Approved" : "Pending");

  let categoryId = null;
  if (categoryName) {
    const categoryDoc = await Category.findOne({ name: { $regex: new RegExp(`^${categoryName.trim()}$`, "i") } });
    if (categoryDoc) categoryId = categoryDoc._id;
  }

  const artwork = await Artwork.create({
    user: effectiveUserId,
    title: autoTitle,
    description: description || "",
    medium: medium || "Other",
    style: style || "Other",
    orientation: orientation || "Landscape",
    category: categoryId,
    dimensions: {
      width: parseFloat(dimensionWidth) || null,
      height: parseFloat(dimensionHeight) || null,
      unit: dimensionUnit || "cm",
    },
    yearCreated: parseInt(yearCreated) || null,
    keywords: parsedKeywords,
    price: 0,
    imageLinks: {
      original: originalUrl,
      thumbnail: thumbUrl,
      small: smallUrl,
      medium: medUrl,
    },
    resolutions: {
      original: { width, height },
      thumbnail: { width: thumbMeta.width, height: thumbMeta.height },
      small: { width: smallMeta.width, height: smallMeta.height },
      medium: { width: medMeta.width, height: medMeta.height },
    },
    fileSize: req.file.size,
    slug,
    isActive: isAdminUser ? isPublished : false,
    isApproved: isAdminUser ? isPublished : false,
    featuredArtwork: isFeatured,
    uploadSource: source,
    approvalStatus: initialApprovalStatus,
  });

  res.status(201).json({ success: true, artwork });
});


/**
 * @desc    Get all artworks by the logged-in photographer (their workspace)
 * @route   GET /api/artworks/my-artworks
 * @access  Protected (Photographer | Admin)
 */
const getMyArtworks = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const skip = (page - 1) * pageSize;
  const search = req.query.search || "";
  const medium = req.query.medium || "";
  const status = req.query.status || "";

  const filter = { user: userId };
  if (search) filter.title = { $regex: search, $options: "i" };
  if (medium) filter.medium = medium;
  if (status === "approved") { filter.isApproved = true; filter.isActive = true; }
  else if (status === "pending") { filter.isApproved = false; filter.isActive = false; filter.rejectionReason = { $size: 0 }; }
  else if (status === "rejected") { filter.rejectionReason = { $not: { $size: 0 } }; }

  const [artworks, total] = await Promise.all([
    Artwork.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    Artwork.countDocuments(filter),
  ]);

  const populated = artworks.map((art) => ({
    ...art,
    photographer: art.user || null,
  }));

  res.status(200).json({
    success: true,
    artworks: populated,
    total,
    page,
    pageCount: Math.ceil(total / pageSize),
  });
});

/**
 * @desc    Public gallery of all approved artworks
 * @route   GET /api/artworks/public
 * @access  Public
 */
const getPublicArtworks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || parseInt(req.query.pageNumber) || 1;
  const pageSize = parseInt(req.query.pageSize) || 24;
  const skip = (page - 1) * pageSize;
  const search = req.query.search || req.query.q || req.query.Query || "";
  const orientation = req.query.orientation || "";
  const featured = req.query.featured || "";
  const photographer = req.query.photographer || "";
  const sort = req.query.sort || req.query.sortType || "newest";

  const filter = { isActive: true, isApproved: true, isAvailable: { $ne: false } };
  if (search) filter.$or = [
    { title: { $regex: search, $options: "i" } },
    { keywords: { $regex: search, $options: "i" } },
  ];
  if (orientation) filter.orientation = orientation;
  if (featured === "true") filter.featuredArtwork = true;
  if (photographer) filter.user = photographer;

  const categoryId = req.query.categoryId || req.query.category;
  if (categoryId && categoryId !== "all" && categoryId !== "undefined") {
    filter.category = categoryId;
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
  };

  const rawArtworks = await Artwork.find(filter)
    .populate("category", "name")
    .sort(sortMap[sort] || { createdAt: -1 })
    .lean();

  const userIds = [...new Set(rawArtworks.map((art) => art.user).filter(Boolean))];
  const [photographers, users] = await Promise.all([
    Photographer.find({ _id: { $in: userIds } }, "firstName lastName username profileImage").lean(),
    User.find({ _id: { $in: userIds } }, "firstName lastName username profileImage").lean(),
  ]);

  const userMap = {};
  photographers.forEach((p) => { userMap[p._id.toString()] = p; });
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const populated = rawArtworks.map((art) => {
    const userObj = art.user ? userMap[art.user.toString()] || null : null;
    return {
      ...art,
      user: userObj,
      photographer: userObj,
      category: art.category ? [art.category] : [],
    };
  });

  const artworks = populated.filter((art) => art.user);
  const total = artworks.length;
  const paginatedArtworks = artworks.slice(skip, skip + pageSize);

  res.status(200).json({
    success: true,
    artworks: paginatedArtworks,
    photos: paginatedArtworks, // Support both formats for frontend compatibility
    total,
    page,
    pageCount: Math.ceil(total / pageSize),
  });
});

/**
 * @desc    Get artwork by slug (public detail page)
 * @route   GET /api/artworks/slug/:slug or /api/artworks/get-image-by-slug?slug=:slug
 * @access  Public
 */
const getArtworkBySlug = asyncHandler(async (req, res) => {
  const slug = req.params.slug || req.query.slug;
  if (!slug) {
    return res.status(400).json({ success: false, message: "Slug is required." });
  }
  const artwork = await Artwork.findOne({ slug, isApproved: true, isActive: true })
    .populate("user", "firstName lastName username profileImage")
    .populate("category", "name")
    .lean();
  if (!artwork) {
    return res.status(404).json({ success: false, message: "Artwork not found." });
  }
  artwork.photographer = artwork.user;
  artwork.category = artwork.category ? [artwork.category] : [];
  res.status(200).json({ success: true, artwork });
});

/**
 * @desc    Get all artworks (admin view with full filters)
 * @route   GET /api/artworks/admin/all
 * @access  Admin
 */
const getAllArtworksAdmin = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const skip = (page - 1) * pageSize;
  const search = req.query.search || "";
  const medium = req.query.medium || "";
  const status = req.query.status || "";
  const featured = req.query.featured || "";
  const photographer = req.query.photographer || "";

  const filter = {};
  if (search) filter.title = { $regex: search, $options: "i" };
  if (medium) filter.medium = medium;
  if (photographer) filter.user = photographer;
  if (featured === "true") filter.featuredArtwork = true;
  if (status === "approved") { filter.isApproved = true; filter.isActive = true; }
  else if (status === "pending") { filter.isApproved = false; filter.isActive = false; }
  else if (status === "rejected") { filter.rejectionReason = { $not: { $size: 0 } }; filter.isApproved = false; }

  const rawArtworks = await Artwork.find(filter)
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .lean();

  const userIds = [...new Set(rawArtworks.map((art) => art.user).filter(Boolean))];
  const [photographers, users] = await Promise.all([
    Photographer.find({ _id: { $in: userIds } }, "firstName lastName username profileImage").lean(),
    User.find({ _id: { $in: userIds } }, "firstName lastName username profileImage").lean(),
  ]);

  const userMap = {};
  photographers.forEach((p) => { userMap[p._id.toString()] = p; });
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const populated = rawArtworks.map((art) => {
    const userObj = art.user ? userMap[art.user.toString()] || null : null;
    return {
      ...art,
      user: userObj,
      photographer: userObj,
      category: art.category ? [art.category] : [],
    };
  });

  const artworks = populated.filter((art) => art.user);
  const total = artworks.length;
  const paginatedArtworks = artworks.slice(skip, skip + pageSize);

  res.status(200).json({
    success: true,
    artworks: paginatedArtworks,
    total,
    page,
    pageCount: Math.ceil(total / pageSize),
  });
});

/**
 * @desc    Get single artwork by ID (admin/owner)
 * @route   GET /api/artworks/:id
 * @access  Protected
 */
const getArtworkById = asyncHandler(async (req, res) => {
  const artwork = await Artwork.findById(req.params.id)
    .populate("user", "firstName lastName username profileImage email")
    .populate("category", "name")
    .lean();
  if (!artwork) {
    return res.status(404).json({ success: false, message: "Artwork not found." });
  }
  artwork.photographer = artwork.user;
  artwork.category = artwork.category ? [artwork.category] : [];
  res.status(200).json({ success: true, artwork });
});

/**
 * @desc    Update artwork details
 * @route   PUT /api/artworks/:id
 * @access  Protected (owner or admin)
 */
const updateArtwork = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const isAdmin = ["Admin", "admin", "seo"].includes(req.user.type);

  const artwork = await Artwork.findById(req.params.id);
  if (!artwork) {
    return res.status(404).json({ success: false, message: "Artwork not found." });
  }

  // Only owner or admin can update
  if (!isAdmin && artwork.user.toString() !== userId.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized." });
  }

  const allowedFields = ["title", "description", "medium", "style", "orientation", "price", "yearCreated", "keywords", "isAvailable"];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) artwork[field] = req.body[field];
  });

  if (isAdmin) {
    if (req.body.photographerId) {
      artwork.user = req.body.photographerId;
    }
    if (req.body.categoryName) {
      const categoryDoc = await Category.findOne({ name: { $regex: new RegExp(`^${req.body.categoryName.trim()}$`, "i") } });
      if (categoryDoc) artwork.category = categoryDoc._id;
    }
    if (req.body.publishStatus) {
      const active = req.body.publishStatus === "published";
      artwork.isActive = active;
      artwork.isApproved = active;
    }
    if (req.body.featured !== undefined) {
      artwork.featuredArtwork = req.body.featured === "true" || req.body.featured === true;
    }
  }

  if (req.body.dimensionWidth || req.body.dimensionHeight) {
    artwork.dimensions = {
      width: parseFloat(req.body.dimensionWidth) || artwork.dimensions?.width,
      height: parseFloat(req.body.dimensionHeight) || artwork.dimensions?.height,
      unit: req.body.dimensionUnit || artwork.dimensions?.unit || "cm",
    };
  }

  await artwork.save();
  res.status(200).json({ success: true, artwork });
});

/**
 * @desc    Delete artwork (removes S3 assets + DB record)
 * @route   DELETE /api/artworks/:id
 * @access  Protected (owner or admin)
 */
const deleteArtwork = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const isAdmin = ["Admin", "admin", "seo"].includes(req.user.type);
  const artworkId = req.params.id || req.query.id || req.body.id;

  const artwork = await Artwork.findById(artworkId);
  if (!artwork) {
    return res.status(404).json({ success: false, message: "Artwork not found." });
  }

  if (!isAdmin && artwork.user.toString() !== userId.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized." });
  }

  // Delete all S3 assets
  if (artwork.imageLinks) {
    await Promise.allSettled([
      deleteFromS3(artwork.imageLinks.original),
      deleteFromS3(artwork.imageLinks.thumbnail),
      deleteFromS3(artwork.imageLinks.small),
      deleteFromS3(artwork.imageLinks.medium),
    ]);
  }

  await Artwork.findByIdAndDelete(artworkId);
  res.status(200).json({ success: true, message: "Artwork deleted successfully." });
});

/**
 * @desc    Approve or reject an artwork (admin only)
 * @route   POST /api/artworks/approve
 * @access  Admin
 */
const approveArtwork = asyncHandler(async (req, res) => {
  const { artworkId, status, rejectionReason } = req.body;

  if (!artworkId || !status) {
    return res.status(400).json({ success: false, message: "artworkId and status are required." });
  }

  const artwork = await Artwork.findById(artworkId);
  if (!artwork) {
    return res.status(404).json({ success: false, message: "Artwork not found." });
  }

  if (status === "approved") {
    artwork.isApproved = true;
    artwork.isActive = true;
    artwork.rejectionReason = [];
  } else if (status === "rejected") {
    artwork.isApproved = false;
    artwork.isActive = false;
    artwork.rejectionReason = rejectionReason ? [rejectionReason] : ["Does not meet quality standards."];
  } else {
    return res.status(400).json({ success: false, message: "Invalid status. Use 'approved' or 'rejected'." });
  }

  await artwork.save();
  res.status(200).json({ success: true, artwork });
});

/**
 * @desc    Toggle featured status of an artwork (admin only)
 * @route   POST /api/artworks/toggle-featured
 * @access  Admin
 */
const toggleFeaturedArtwork = asyncHandler(async (req, res) => {
  const { artworkId } = req.body;
  const artwork = await Artwork.findById(artworkId);
  if (!artwork) {
    return res.status(404).json({ success: false, message: "Artwork not found." });
  }
  artwork.featuredArtwork = !artwork.featuredArtwork;
  await artwork.save();
  res.status(200).json({ success: true, artwork, featured: artwork.featuredArtwork });
});

/**
 * @desc    Get all pending artworks for admin review
 * @route   GET /api/artworks/admin/pending
 * @access  Admin
 */
const getPendingArtworks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const skip = (page - 1) * pageSize;

  const filter = { isApproved: false, isActive: false, rejectionReason: { $size: 0 } };

  const [artworks, total] = await Promise.all([
    Artwork.find(filter)
      .populate("user", "firstName lastName username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Artwork.countDocuments(filter),
  ]);

  const populatedPending = artworks.map((art) => ({
    ...art,
    photographer: art.user || null,
  }));

  res.status(200).json({ success: true, artworks: populatedPending, total, page, pageCount: Math.ceil(total / pageSize) });
});

/**
 * @desc    Get all rejected artworks
 * @route   GET /api/artworks/admin/rejected
 * @access  Admin
 */
const getRejectedArtworks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const skip = (page - 1) * pageSize;

  const filter = { isApproved: false, rejectionReason: { $not: { $size: 0 } } };

  const [artworks, total] = await Promise.all([
    Artwork.find(filter)
      .populate("user", "firstName lastName username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Artwork.countDocuments(filter),
  ]);

  const populatedRejected = artworks.map((art) => ({
    ...art,
    photographer: art.user || null,
  }));

  res.status(200).json({ success: true, artworks: populatedRejected, total, page, pageCount: Math.ceil(total / pageSize) });
});

/**
 * @desc    Get all user uploaded artworks for admin review
 * @route   GET /api/artworks/admin/user-uploaded
 * @access  Admin
 */
const getUserUploadedArtworks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const skip = (page - 1) * pageSize;
  const search = req.query.search || "";
  const status = req.query.status || "";

  const filter = { uploadSource: "user" };
  if (search) filter.title = { $regex: search, $options: "i" };
  if (status === "approved") { filter.approvalStatus = "Approved"; }
  else if (status === "pending") { filter.approvalStatus = "Pending"; }
  else if (status === "rejected") { filter.approvalStatus = "Rejected"; }

  const rawArtworks = await Artwork.find(filter)
    .populate("category", "name")
    .sort({ createdAt: -1 })
    .lean();

  const userIds = [...new Set(rawArtworks.map((art) => art.user).filter(Boolean))];
  const [photographers, users] = await Promise.all([
    Photographer.find({ _id: { $in: userIds } }, "firstName lastName username profileImage email").lean(),
    User.find({ _id: { $in: userIds } }, "firstName lastName username profileImage email").lean(),
  ]);

  const userMap = {};
  photographers.forEach((p) => { userMap[p._id.toString()] = p; });
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const populated = rawArtworks.map((art) => {
    const userObj = art.user ? userMap[art.user.toString()] || null : null;
    return {
      ...art,
      user: userObj,
      photographer: userObj,
      category: art.category ? [art.category] : [],
    };
  });

  const artworks = populated.filter((art) => art.user);
  const total = artworks.length;
  const paginatedArtworks = artworks.slice(skip, skip + pageSize);

  res.status(200).json({
    success: true,
    artworks: paginatedArtworks,
    total,
    page,
    pageCount: Math.ceil(total / pageSize),
  });
});

/**
 * @desc    Approve a user uploaded artwork (admin only)
 * @route   POST /api/artworks/admin/user-uploaded/approve
 * @access  Admin
 */
const approveUserUploadedArtwork = asyncHandler(async (req, res) => {
  const { artworkId } = req.body;
  if (!artworkId) return res.status(400).json({ success: false, message: "artworkId is required." });

  const artwork = await Artwork.findById(artworkId);
  if (!artwork) return res.status(404).json({ success: false, message: "Artwork not found." });
  if (artwork.uploadSource !== "user") return res.status(400).json({ success: false, message: "Only user uploaded artworks can be processed here." });

  artwork.approvalStatus = "Approved";
  artwork.isActive = true;
  artwork.isApproved = true;
  artwork.approvedBy = req.user._id;
  artwork.approvedAt = new Date();
  artwork.rejectionReason = [];
  artwork.rejectedReasonStr = "";

  await artwork.save();
  res.status(200).json({ success: true, artwork });
});

/**
 * @desc    Reject a user uploaded artwork (admin only)
 * @route   POST /api/artworks/admin/user-uploaded/reject
 * @access  Admin
 */
const rejectUserUploadedArtwork = asyncHandler(async (req, res) => {
  const { artworkId, rejectionReason } = req.body;
  if (!artworkId) return res.status(400).json({ success: false, message: "artworkId is required." });

  const artwork = await Artwork.findById(artworkId);
  if (!artwork) return res.status(404).json({ success: false, message: "Artwork not found." });
  if (artwork.uploadSource !== "user") return res.status(400).json({ success: false, message: "Only user uploaded artworks can be processed here." });

  artwork.approvalStatus = "Rejected";
  artwork.isActive = false;
  artwork.isApproved = false;
  artwork.rejectedAt = new Date();
  artwork.rejectedReasonStr = rejectionReason || "Does not meet quality standards.";
  artwork.rejectionReason = [artwork.rejectedReasonStr];

  await artwork.save();
  res.status(200).json({ success: true, artwork });
});

/**
 * @desc    Delete user uploaded artwork (removes S3 assets + DB record)
 * @route   DELETE /api/artworks/admin/user-uploaded/:id
 * @access  Admin
 */
const deleteUserUploadedArtwork = asyncHandler(async (req, res) => {
  const artworkId = req.params.id;
  
  const artwork = await Artwork.findById(artworkId);
  if (!artwork) return res.status(404).json({ success: false, message: "Artwork not found." });
  if (artwork.uploadSource !== "user") return res.status(400).json({ success: false, message: "Only user uploaded artworks can be processed here." });

  // Delete all S3 assets
  if (artwork.imageLinks) {
    await Promise.allSettled([
      deleteFromS3(artwork.imageLinks.original),
      deleteFromS3(artwork.imageLinks.thumbnail),
      deleteFromS3(artwork.imageLinks.small),
      deleteFromS3(artwork.imageLinks.medium),
    ]);
  }

  await Artwork.findByIdAndDelete(artworkId);
  res.status(200).json({ success: true, message: "User uploaded artwork deleted successfully." });
});

module.exports = {
  uploadArtwork,
  getMyArtworks,
  getPublicArtworks,
  getArtworkBySlug,
  getAllArtworksAdmin,
  getArtworkById,
  updateArtwork,
  deleteArtwork,
  approveArtwork,
  toggleFeaturedArtwork,
  getPendingArtworks,
  getRejectedArtworks,
  getUserUploadedArtworks,
  approveUserUploadedArtwork,
  rejectUserUploadedArtwork,
  deleteUserUploadedArtwork,
};
