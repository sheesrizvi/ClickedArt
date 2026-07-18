const ArtworkCategory = require("../models/artworkCategoryModel.js");

const seedArtworkCategories = async () => {
  const predefinedCategories = [
    "Altered",
    "Maximalist",
    "Trendy",
    "Neutral",
    "Countryside",
    "Mediterranean",
    "Flower Market and Watercolor",
    "Dark Ghotic",
    "4 Seasons",
    "Kitchen, Bar Cart, Fruits",
    "Vintage Landscape",
    "Bohémien",
    "Beach House",
    "Eclectic",
    "Travel",
    "Japanese",
    "Lucky You",
    "Picasso",
    "Summer",
    "Modern",
    "Botticelli",
    "Spring",
    "Painters",
    "Matisse",
    "Frame TV",
    "Cowgirl Maximalist",
    "Summer Maximalist",
    "Guest Check",
    "Abstract",
    "Aura",
    "Preppy",
    "Pop Art",
    "Coquette",
    "Nursery",
    "Animals",
    "Abstract Flower",
    "Autumn",
    "Vintage Colorful"
  ];

  try {
    for (const catName of predefinedCategories) {
      const exists = await ArtworkCategory.findOne({ name: catName });
      if (!exists) {
        await ArtworkCategory.create({
          name: catName,
          description: `${catName} Artwork Category`,
          coverImage: "/assets/placeholders/image.webp",
          tags: [catName]
        });
        console.log(`Seeded artwork category: ${catName}`);
      }
    }
    console.log("Artwork categories seeding check completed successfully.");
  } catch (error) {
    console.error("Error seeding artwork categories:", error.message);
  }
};

module.exports = { seedArtworkCategories };
