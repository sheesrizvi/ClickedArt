const asyncHandler = require('express-async-handler')
const UserType= require('../../models/typeModel.js')
const ImageAnalytics = require('../../models/imagebase/imageAnalyticsModel.js')
const Follow = require('../../models/socials/followModel.js')
const User = require('../../models/userModel.js')
const Photographer = require('../../models/photographerModel.js')
const ImageVault = require('../../models/imagebase/imageVaultModel.js')

// @ Follow/Unfollow User
const followUser = asyncHandler(async (req, res) => {
    const { followerId, followingId } = req.body 
    if(!followerId || !followingId) return res.status(400).send({ message: "FollowerId and FollowingId is required" })

    const followerType = await UserType.findOne({ user: followerId }).select('type -_id')
    const followingType = await UserType.findOne({ user: followingId }).select('type -_id')
    if(!followerType || !followingType || !followerType.type || !followingType.type) return res.status(400).send({ message: 'Follower User or Following User not found' })

    const followExist = await Follow.findOne({ 
        'followerInfo.user': followerId,
        'followingInfo.user': followingId
     })
   
    if(followExist){
       return res.status(400).send({ message: 'User already followed' })
    }
    const follow = await Follow.create({
        followerInfo: {
            user: followerId,
            userType: followerType.type
        },
        followingInfo: {
            user: followingId,
            userType: followingType.type
        }
    })
   
    let Type = followerType.type
    let Model = Type === 'User' ? User : Vendor
   
    await Model.findOneAndUpdate({ _id: followerId }, {$inc: { followingCount: 1 } })
    Type = followingType.type
    Model = Type === 'User' ? User : Vendor
    await Model.findOneAndUpdate({ _id: followingId }, { $inc: { followersCount: 1 } })
    res.status(200).send({ message: 'Follow request successfull', follow , followExist: true })
})

// @ Unfollow User
const unfollowUser = asyncHandler(async (req, res) => {
    const { followerId, followingId } = req.query
    if(!followerId || !followingId) return res.status(400).send({ message: "FollowerId and FollowingId is required" })
    
    const followerType = await UserType.findOne({ user: followerId }).select('type -_id').lean();
    const followingType = await UserType.findOne({ user: followingId }).select('type -_id').lean();
    if(!followerType || !followingType) return res.status(400).send({ message: 'Follower User or Following User not found' })
    
    const isUserFollowed = await Follow.findOne({ 'followerInfo.user': followerId, 'followingInfo.user': followingId })

    if(!isUserFollowed) return res.status(400).send({ message: 'Follow Relation not found' })
        
    await Follow.findOneAndDelete({ 'followerInfo.user': followerId, 'followingInfo.user': followingId })
    let Type = followerType.type
    let Model = Type === 'User' ? User : Vendor
    await Model.findOneAndUpdate({ _id: followerId }, {$inc: { followingCount: -1 } })
    Type = followingType.type
    Model = Type === 'User' ? User : Vendor
         
    await Model.findOneAndUpdate({ _id: followingId }, { $inc: { followersCount: -1 } })
           
    await Follow.deleteOne({ 'followerInfo.user': followerId, 'followingInfo.user': followingId})
    res.status(200).send({ message: 'User unfollowed succesfully', followExist: false })
})

// @ Check whether follower is following a user
const isFollowing = asyncHandler(async (req, res) => {
    const { followerId, followingId } = req.query
    if(!followerId || !followingId) return res.status(400).send({ message: "FollowerId and FollowingId is required" })
    
    const isUserFollowed = await Follow.findOne({ 'followerInfo.user': followerId, 'followingInfo.user': followingId })
    if(!isUserFollowed) return res.status(400).send({ isFollow: false })
    
    res.status(200).send({ isFollow: true })
})

// @ Retrieves a list of followers for a specific user
const getFollowers = asyncHandler(async (req, res) => {
    const { userId, pageNumber = 1, pageSize = 20 } = req.query 
    if(!userId) return res.status(400).send({ message: 'User Id is required to get followers count' })

    const [followerDetails, countDocuments] = await Promise.all(
        [
          Follow.find({ 'followingInfo.user': userId }).populate({
                path: 'followerInfo.user',
            }).skip((pageNumber - 1) * pageSize).limit(pageSize),
            Follow.countDocuments({ 'followingInfo.user': userId })
        ]
    )
    
    if(!followerDetails || followerDetails.length === 0) return res.status(400).send({ message: 'Followers not found' })
   
    const pageCount = Math.ceil(countDocuments/pageSize)
    const followers = followerDetails.map((follow) => (follow.followerInfo.user))

    res.status(200).send({ message: 'Followers Found', followers , pageCount})
})

// @ Retrieves a list of following for a specific user
const getFollowing = asyncHandler(async (req, res) => {
    const { userId, pageNumber = 1, pageSize = 20  } = req.query 

    const [followingDetails, countDocuments] = await Promise.all(
        [
            Follow.find({
                'followerInfo.user': userId
            }).populate(
                {
                    path: 'followingInfo.user',
                }
                
            )
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize)
            ,
            Follow.countDocuments({
                'followerInfo.user': userId
            })
        ]
    )
    if(!followingDetails || followingDetails.length === 0) return res.status(400).send({ message: 'User Following not found' })
    
    const following = followingDetails.map((follow) => (follow.followingInfo.user))
    const pageCount = Math.ceil(countDocuments/pageSize)

    res.status(200).send({ message: 'Following found', following, pageCount })
})


// @ List mutual followers between two users
const isMutualFollower = asyncHandler(async(req, res) => {
    const { userId1, userId2 } = req.query 
    if(!userId1 || !userId2) return res.status(400).send({ message: 'User Id is required to get followers count' })

    const firstUserFollowStatus = await Follow.findOne({ 'followerInfo.user': userId1, 'followingInfo.user': userId2 })
    const secondUserFollowStatus = await Follow.findOne({ 'followerInfo.user': userId2, 'followingInfo.user': userId1 })

    if(!firstUserFollowStatus || !secondUserFollowStatus) return res.status(400).send({ isMutualFollower: false })
    
    res.status(200).send({ isMutualFollower: true })
})

// @ Get user's followers count
const getFollowersCount = asyncHandler(async (req, res) => {
    const { userId } = req.query 
    if(!userId) return res.status(400).send({ message: 'User Id is required to get followers count' })
    const followers = await Follow.countDocuments({ 'followingInfo.user': userId })  
    console.log(followers)    
    res.status(200).send({ message: 'Followers Count', followersCount: followers })

})

// @ Get user's following count
const getFollowingCount = asyncHandler(async (req, res) => {
    const { userId } = req.query 
    if(!userId) return res.status(400).send({ message: 'User Id is required to get following count' })
    const following = await Follow.countDocuments({ 'followerInfo.user': userId })      
    res.status(200).send({ message: 'Following Count', followingCount: following })
})

// @ suggest accounts based on user interests, mutual friends etc
const getSuggestedFollows = asyncHandler(async (req, res) => {
    const { userId, pageNumber = 1, pageSize = 10 } = req.query;
    if (!userId) {
        return res.status(400).send({ message: "User Id is required to get suggested follows" });
    }
    const skip = (pageNumber - 1) * pageSize;
    const userType = await UserType.findOne({ user: userId }).select('type -_id')
    if(!userType || !userType.type) return res.status(400).send({ message: 'User not found' }) 
    let Type = userType.type
    let Model = Type === 'User' ? User : Vendor
    const user = await Model.findById(userId)
    if (!user) {
        return res.status(404).send({ message: "User not found" });
    }
    const { coordinates: [longitude, latitude] } = user.location;
    const userInterests = user.interests || [];
    let users = await User.find({
        
        $and: [
            {
                location: {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], 10000 / 6378137] 
                }
            },
        },
        {
            _id: { $ne: user._id }
        }
        ]
       
    }).select('name email age image address location username dob followersCount followingCount postCount');

   

    const suggestions = await Follow.aggregate([
        {
            $match: {
                "followerInfo.user": mongoose.Types.ObjectId.createFromHexString(userId)
            }
        },
        {
            $lookup: {
                from: "follows",
                localField: "followingInfo.user",
                foreignField: "followerInfo.user",
                as: "followingConnections"
            }
        },
        { $unwind: "$followingConnections" },
        {
            $lookup: {
                from: "follows",
                localField: "followingConnections.followingInfo.user",
                foreignField: "followingInfo.user",
                as: "suggestedFollows"
            }
        },
        { $unwind: "$suggestedFollows" },
        {
            $lookup: {
                from: "users",
                localField: "followingConnections.followingInfo.user",
                foreignField: "_id",
                as: "suggestedUserData"
            }
        },
        { $unwind: { path: "$suggestedUserData", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "vendors",
                localField: "followingConnections.followingInfo.user",
                foreignField: "_id",
                as: "suggestedVendor"
            }
        },
        { $unwind: { path: "$suggestedVendor", preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                suggestedUser: {
                    $cond: {
                        if: { $ne: [{ $ifNull: ['$suggestedUserData', ''] }, ''] },
                        then: '$suggestedUserData',
                        else: '$suggestedVendor'
                    }
                }
            }
        },
        {
            $match: {
                "suggestedUser._id": { $ne: mongoose.Types.ObjectId.createFromHexString(userId) }
            }
        },
        {
            $project: {
                _id: "$suggestedUser._id",
                name: "$suggestedUser.name",
                email: "$suggestedUser.email",
                age: "$suggestedUser.age",
                image: "$suggestedUser.image",
                address: "$suggestedUser.address",
                location: "$suggestedUser.location",
                username: "$suggestedUser.username",
                dob: "$suggestedUser.dob",
                interests: "$suggestedUser.interests",
                followersCount: "$suggestedUser.followersCount",
                followingCount: "$suggestedUser.followingCount",
                postCount: "$suggestedUser.postCount"
            }
        },
        {
            $unionWith: {
                coll: "users",
                pipeline: [
                    {
                        $match: {
                            _id: { $ne: mongoose.Types.ObjectId.createFromHexString(userId) },
                            interests: { $in: userInterests }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            email: 1,
                            age: 1,
                            image: 1,
                            address: 1,
                            location: 1,
                            username: 1,
                            dob: 1,
                            interests: 1,
                            followersCount: 1,
                            followingCount: 1,
                            postCount: 1
                        }
                    }
                ]
            }
        },
        {
            $unionWith: {
                coll: "vendors",
                pipeline: [
                    {
                        $match: {
                            _id: { $ne: mongoose.Types.ObjectId.createFromHexString(userId) },
                            interests: { $in: userInterests }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            email: 1,
                            age: 1,
                            image: 1,
                            address: 1,
                            location: 1,
                            username: 1,
                            dob: 1,
                            interests: 1,
                            followersCount: 1,
                            followingCount: 1,
                            postCount: 1
                        }
                    }
                ]
            }
        },
        {
         
            $group: {
                _id: "$_id",
                name: { $first: "$name" },
                email: { $first: "$email" },
                age: { $first: "$age" },
                image: { $first: "$image" },
                address: { $first: "$address" },
                location: { $first: "$location" },
                username: { $first: "$username" },
                interests: { $first: "$interests" },
                dob: { $first: "$dob" },
                followersCount: { $first: "$followersCount" },
                followingCount: { $first: "$followingCount" },
                postCount: { $first: "$postCount" }
            }
        },
        { $skip: skip },
        { $limit: pageSize }
    ]);
    
    
   
    const allSuggestions = [...suggestions, ...users];

   
    const uniqueSuggestionsMap = new Map();
    allSuggestions.forEach(suggestion => {
        uniqueSuggestionsMap.set(suggestion._id.toString(), suggestion); 
    });
    
   
    const uniqueSuggestions = Array.from(uniqueSuggestionsMap.values());
    
    
    const totalSuggestions = Math.ceil(uniqueSuggestions.length / pageSize);
    

    const paginatedSuggestions = uniqueSuggestions.slice(skip, skip + pageSize);


    res.status(200).send({
        message: "Suggested Follows Found",
        suggestions: paginatedSuggestions,
        pageCount: totalSuggestions,
        currentPage: pageNumber,
    });
});








const isBlockedUser = async (requesterId, subjectId) => {
    const blockedUser = await BlockedUser.findOne({
        'userInfo.user': subjectId,
        'blockedUserInfo.user': requesterId
    });
    return blockedUser !== null;
};


const isFollowedUser = async (requesterId, subjectId) => {
    const follow = await Follow.findOne({ 
        follower: requesterId, 
        followee: subjectId 
    });
    return follow !== null;
};


const searchUsers = asyncHandler(async (req, res) => {
    const { requesterId, Query = '', pageNumber = 1, pageSize = 10 } = req.query;
    
    if (!requesterId) {
        return res.status(400).json({ message: 'Requester Id is required' });
    }

    const skip = (pageNumber - 1) * pageSize;


    const privacySettings = await Privacy.find({ 'userInfo.user': { $ne: new mongoose.Types.ObjectId(requesterId) } })
        .populate('userInfo.user');
    
    const users = await User.find({
        // $text: { $search: Query },  
        // 'privacy.searchVisblity': true 
    }).skip(skip).limit(pageSize);
 
  
    const filteredUsers = [];

    for (let user of users) {
        const privacy = privacySettings.find(p => p.userInfo.user.toString() === user._id.toString());

        if (!privacy) continue; 

        const { profileVisiblity } = privacy;
        

        const isBlocked = await isBlockedUser(requesterId, user._id);

        if (isBlocked) continue;


        if (profileVisiblity === 'public' || 
            (profileVisiblity === 'friends' && await isFollowedUser(requesterId, user._id)) || 
            (profileVisiblity === 'private' && requesterId === user._id.toString())) {
            
            filteredUsers.push({
                _id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                location: user.location,
                username: user.username,
                dob: user.dob
            });
        }
    }


    res.status(200).send({
        message: 'User search results',
        users: filteredUsers,
        pageCount: Math.ceil(filteredUsers.length / pageSize),
        currentPage: pageNumber
    });
});






 // @ suggest current trending accounts
const getTrendingFollows = asyncHandler(async (req, res) => {
    const { userId, limit = 20  } = req.query
    
    const trendingFollows = await Follow.aggregate([
        {
           $group: {
            _id: '$followingInfo.user',
            followerCount: { $sum: 1 }
           }
        }, 
        {
            $sort: { followerCount: -1 }
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from : 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        {
            $unwind: "$userDetails"
        },
        {
            $project: {
                _id: "$userDetails._id",
                name: "$userDetails.name",
                email: "$userDetails.email",
                age: "$userDetails.age",
                image: "$userDetails.image",
                address: "$userDetails.address",
                location: "$userDetails.location",
                username: "$userDetails.username",
                dob: "$userDetails.dob"
            }
        }
    ])
    res.status(200).send({trendingFollows: trendingFollows})
})


module.exports = {
    followUser,
    unfollowUser,
    isFollowing,
    getFollowers,
    getFollowing,
    isMutualFollower,
    getFollowersCount,
    getFollowingCount,
    getSuggestedFollows,
    getTrendingFollows,
    searchUsers
}