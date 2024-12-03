const mongoose = require("mongoose")

const followSchema = mongoose.Schema({
    followerInfo: {
        user: { type: mongoose.Schema.Types.ObjectId, refPath: 'followerInfo.userType', required: true },
        userType: { type: String, enum: ['User', 'Photographer'], required: true  }
    },
    followingInfo: {
        user: { type: mongoose.Schema.Types.ObjectId, refPath: 'followingInfo.userType', required: true },
        userType: { type: String, enum: ['User', 'Photographer'], required: true  }
    }
}, { timestamps: true  })


followSchema.index(
    { "followingInfo.user": 1, "followerInfo.user": 1 },
    { unique: true }
  );
  

const Follow = mongoose.model('Follow', followSchema)

module.exports = Follow