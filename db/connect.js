const mongoose = require("mongoose");

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