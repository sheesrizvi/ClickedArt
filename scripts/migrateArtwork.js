const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Artwork = require('../models/artworkModel');

dotenv.config({ path: '../.env' });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const migrateArtworks = async () => {
    try {
        await connectDB();
        console.log("Connected to DB, starting migration...");

        const artworks = await Artwork.find({});
        console.log(`Found ${artworks.length} artworks to process.`);

        let updatedCount = 0;

        for (let artwork of artworks) {
            let modified = false;
            
            // Clean up imageLinks
            if (artwork.imageLinks && (artwork.imageLinks.medium || artwork.imageLinks.small)) {
                artwork.imageLinks.medium = undefined;
                artwork.imageLinks.small = undefined;
                modified = true;
            }

            // Clean up resolutions
            if (artwork.resolutions && (artwork.resolutions.medium || artwork.resolutions.small)) {
                artwork.resolutions.medium = undefined;
                artwork.resolutions.small = undefined;
                modified = true;
            }

            // Price was changed to Number, but existing might be an Object in the DB.
            if (artwork.price !== undefined && typeof artwork.price === 'object') {
                artwork.price = artwork.price.original || 0;
                modified = true;
            }

            if (modified) {
                await artwork.save();
                updatedCount++;
                console.log(`Updated artwork: ${artwork._id}`);
            }
        }

        console.log(`Migration completed successfully! Updated ${updatedCount} records.`);
        process.exit(0);
    } catch (error) {
        console.error(`Migration failed: ${error.message}`);
        process.exit(1);
    }
}

migrateArtworks();
