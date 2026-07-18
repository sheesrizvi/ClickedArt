require('dotenv').config();
const mongoose = require('mongoose');

const dbOptions = {
  dbName : 'ClickedArt'
};

mongoose.connect(process.env.MONGO_URI, dbOptions).then(async () => {
  console.log('Connected to MongoDB. Starting migration...');
  
  // Set isApproved = true for all artworks with isActive = true
  const resApproved = await mongoose.connection.collection('artworks').updateMany(
    { isActive: true },
    { $set: { isApproved: true } }
  );
  console.log('Updated isApproved:', resApproved);

  // Set isAvailable = true for all artworks
  const resAvailable = await mongoose.connection.collection('artworks').updateMany(
    {},
    { $set: { isAvailable: true } }
  );
  console.log('Updated isAvailable:', resAvailable);

  mongoose.disconnect();
  console.log('Migration completed successfully.');
}).catch(err => {
  console.error('Error during migration:', err);
});
