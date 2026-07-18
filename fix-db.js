const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://developer:fM7bFis4t2oN0bB1@ac-ez5z759-shard-00-00.qzxivp1.mongodb.net/ClickedArt?retryWrites=true&w=majority').then(async () => {
  const res = await mongoose.connection.collection('artworks').updateMany(
    { user: { $exists: true } },
    { $rename: { 'user': 'photographer' } }
  );
  console.log('Updated:', res);
  mongoose.disconnect();
});
