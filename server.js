require('dotenv').config()
const express = require("express");
const {dbConnect} = require('./db/connect.js')
const cors = require('cors')
const { notFound, errorHandler } = require('./middleware/errorMiddleware.js')
const userRoutes = require('./routes/userRoutes')
const adminRoutes = require('./routes/adminRoutes.js')
const photographerRoutes = require('./routes/photographerRoutes.js')
const categoryRoutes = require('./routes/categoryRoutes.js')
const imageVaultRoutes = require('./routes/imagebase/imageVaultRoutes.js')
const royaltyRoutes = require('./routes/imagebase/royaltyRoutes.js')
const likeRoutes = require('./routes/likeRoutes.js')
const commentRoutes = require('./routes/commentRoutes.js')
const followRoutes = require('./routes/followRoutes.js')
const planRoutes = require('./routes/planRoutes.js')
const subscriptionRoutes = require('./routes/subscriptionRoutes.js')
const paperRoutes = require('./routes/imagebase/paperRoutes.js')
const frameRoutes = require('./routes/imagebase/frameRoutes.js')
const downloadRoutes = require('./routes/downloadRoutes.js')
const invoiceRoutes = require('./routes/invoiceRoutes.js')
const gstRoutes = require('./routes/gstRoutes.js')
const blogRoutes = require('./routes/blogRoutes.js')
const upload  = require("./routes/upload");

const app = express();
app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());
app.use("/api/upload", upload);
app.use('/api/user', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/photographer', photographerRoutes)
app.use('/api/category', categoryRoutes)
app.use('/api/images', imageVaultRoutes)
app.use('/api/royalty', royaltyRoutes)
app.use('/api/likes', likeRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/follow', followRoutes)
app.use('/api/plans', planRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/frames', frameRoutes)
app.use('/api/paper', paperRoutes)
app.use('/api/download', downloadRoutes)
app.use('/api/royalty', royaltyRoutes)
app.use('/api/invoice', invoiceRoutes)
app.use('/api/gst', gstRoutes)
app.use('/api/blog', blogRoutes)

dbConnect()


app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Successfully served on port: ${PORT}.`);
});
  