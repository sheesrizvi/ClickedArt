const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'controller', 'orderController.js');
const destPath = path.join(__dirname, '..', 'controller', 'artworkOrderController.js');

let content = fs.readFileSync(srcPath, 'utf8');

// Replacements:
// 1. Models imports
content = content.replace(
  'const Order = require("../models/orderModel");',
  'const ArtworkOrder = require("../models/artworkOrderModel");'
);
content = content.replace(
  'const ImageVault = require("../models/imagebase/imageVaultModel");',
  'const Artwork = require("../models/artworkModel");'
);
content = content.replace(
  'const ImageAnalytics = require("../models/imagebase/imageAnalyticsModel.js");',
  'const ArtworkAnalytics = require("../models/artworkAnalyticsModel.js");'
);

// 2. Class/Variable names
// Replace model lookups and references
// Order Mongoose model queries
content = content.replace(/\bOrder\b/g, 'ArtworkOrder');
// ImageVault model queries
content = content.replace(/\bImageVault\b/g, 'Artwork');
// ImageAnalytics model queries
content = content.replace(/\bImageAnalytics\b/g, 'ArtworkAnalytics');

// 3. Price resolution lookup
// In calculateCartItemsPrice
const searchStr1 = `        const imagePrice =
          resolution === "small"
            ? image.price.small
            : resolution === "medium"
            ? image.price.medium
            : image.price.original;`;

const replaceStr1 = `        const imagePrice = image.price || 0;`;

if (content.includes(searchStr1)) {
  content = content.replace(searchStr1, replaceStr1);
} else {
  console.log("Warning: searchStr1 not found, checking with regex");
  const regex1 = /const\s+imagePrice\s*=\s*resolution\s*===\s*"small"\s*\?\s*image\.price\.small\s*:\s*resolution\s*===\s*"medium"\s*\?\s*image\.price\.medium\s*:\s*image\.price\.original;/g;
  content = content.replace(regex1, replaceStr1);
}

// In calculateCartPrice
const searchStr2 = `        const imagePrice =
          resolution === "small"
            ? image.price.small
            : resolution === "medium"
            ? image.price.medium
            : image.price.original;`;

const replaceStr2 = `        const imagePrice = image.price || 0;`;

// Since it's repeated twice in orderController, let's do a global replace or do it repeatedly.
content = content.replaceAll(searchStr1, replaceStr1);

// Let's write the generated file as UTF-8
fs.writeFileSync(destPath, content, 'utf8');
console.log("Successfully generated artworkOrderController.js in UTF-8 encoding");
