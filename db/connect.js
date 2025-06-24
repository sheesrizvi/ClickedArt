const mongoose = require("mongoose");
const Wishlist = require('../models/wishlistModel.js')
const ImageVault = require('../models/imagebase/imageVaultModel.js')
const Blog = require('../models/socials/blogModel.js' )
const Story = require('../models/storyModel.js')
const { generateSlug } = require('../middleware/slugMiddleware.js')
const Photographer = require('../models/photographerModel.js')
const User = require('../models/userModel.js')

const dbConnect = async () => {
    try {
       const dbOptions = {
        dbName : 'ClickedArt'
       }
        const connectionInstance =  await mongoose.connect(process.env.MONGO_URI, dbOptions)
        console.log(`MongoDB Connected ${connectionInstance.connection.host} <-> ${connectionInstance.connection.name}`)
     
        
       
    } catch(e) {
        console.log('MongoDB Connection Error', e.message)
        process.exit(1)
    }
}

module.exports = {
    dbConnect
}