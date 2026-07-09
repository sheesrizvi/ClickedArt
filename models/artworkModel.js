const mongoose = require("mongoose");
require("./categoryModel");

const artworkSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photographer",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    medium: {
      type: String,
      trim: true,
      enum: [
        "Oil",
        "Acrylic",
        "Watercolor",
        "Gouache",
        "Pastel",
        "Charcoal",
        "Pencil",
        "Ink",
        "Digital",
        "Mixed Media",
        "Other",
      ],
      default: "Other",
    },
    style: {
      type: String,
      trim: true,
      enum: [
        "Abstract",
        "Realism",
        "Impressionism",
        "Expressionism",
        "Surrealism",
        "Minimalism",
        "Pop Art",
        "Cubism",
        "Landscape",
        "Portrait",
        "Still Life",
        "Other",
      ],
      default: "Other",
    },
    orientation: {
      type: String,
      trim: true,
      enum: ["Portrait", "Landscape", "Square"],
      default: "Landscape",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    dimensions: {
      width: { type: Number },
      height: { type: Number },
      unit: { type: String, enum: ["cm", "inch"], default: "cm" },
    },
    yearCreated: {
      type: Number,
    },
    keywords: [
      {
        type: String,
        trim: true,
      },
    ],
    price: {
      type: Number,
      default: 0,
    },
    imageLinks: {
      original: { type: String, required: true },
      thumbnail: { type: String },
      medium: { type: String },
      small: { type: String },
    },
    resolutions: {
      original: {
        width: { type: Number },
        height: { type: Number },
      },
      medium: {
        width: { type: Number },
        height: { type: Number },
      },
      small: {
        width: { type: Number },
        height: { type: Number },
      },
      thumbnail: {
        width: { type: Number },
        height: { type: Number },
      },
    },
    fileSize: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    rejectionReason: [
      {
        type: String,
        trim: true,
      },
    ],
    featuredArtwork: {
      type: Boolean,
      default: false,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate slug from title + id before saving
artworkSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("title")) {
    const base = (this.title || "artwork")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const unique = `${base}-${Date.now()}`;
    this.slug = unique;
  }
  next();
});

const Artwork = mongoose.model("Artwork", artworkSchema);

module.exports = Artwork;
