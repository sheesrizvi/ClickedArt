const express = require("express");
const multer = require("multer");
const {
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
} = require("../controller/artworkController");
const { IsAdminOrPhotographer, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Multer — in-memory storage for Sharp processing
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WEBP files are allowed."), false);
    }
  },
});

// ─── Public Routes ───────────────────────────────────────────────
router.get("/public", getPublicArtworks);
router.get("/get-images-by-sort-type", getPublicArtworks);
router.get("/search-images", getPublicArtworks);
router.get("/get-image-by-slug", getArtworkBySlug);
router.get("/slug/:slug", getArtworkBySlug);

// ─── Protected Photographer Routes ───────────────────────────────
router.post("/upload", IsAdminOrPhotographer, upload.single("artwork"), uploadArtwork);
router.get("/my-artworks", IsAdminOrPhotographer, getMyArtworks);
router.put("/:id", IsAdminOrPhotographer, updateArtwork);
router.delete("/delete-image", IsAdminOrPhotographer, deleteArtwork);
router.delete("/:id", IsAdminOrPhotographer, deleteArtwork);

// ─── Admin-Only Routes ───────────────────────────────────────────
router.get("/admin/all", isAdmin, getAllArtworksAdmin);
router.get("/admin/pending", isAdmin, getPendingArtworks);
router.get("/admin/rejected", isAdmin, getRejectedArtworks);
router.get("/admin/user-uploaded", isAdmin, getUserUploadedArtworks);
router.post("/admin/user-uploaded/approve", isAdmin, approveUserUploadedArtwork);
router.post("/admin/user-uploaded/reject", isAdmin, rejectUserUploadedArtwork);
router.delete("/admin/user-uploaded/:id", isAdmin, deleteUserUploadedArtwork);
router.get("/:id", isAdmin, getArtworkById);
router.post("/approve", isAdmin, approveArtwork);
router.post("/toggle-featured", isAdmin, toggleFeaturedArtwork);

module.exports = router;
