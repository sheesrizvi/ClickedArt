const asyncHandler = require('express-async-handler')
const WishList = require('../models/wishlistModel.js')


const addItemsInWishList = asyncHandler(async (req, res) => {
    const { userId, imageIds } = req.body

    if(!userId || !imageIds) {
        return res.status(400).send({ message: 'User and Images are required'})
    }

   const wishlist = await WishList.findOneAndUpdate({ user: userId }, { $addToSet: { images: { $each: imageIds } }}, { upsert: true, new: true })

   res.status(200).send({ wishlist })
})

const removeItemsFromWishList = asyncHandler(async (req, res) => {
    const { userId, imageIds } = req.body

    const wishlist = await WishList.findOneAndUpdate({ user: userId },   { $pull: { images: { $in: imageIds } } }, { new: true })

    if(!wishlist) {
        return res.status(400).send({ wishlist })
    }
    res.status(200).send({ message: 'Wishlist updated successfully',  wishlist })
})

const getMyWishList = asyncHandler(async (req, res) => {
    const { userId } = req.query

    const wishlist = await WishList.findOne({ user: userId }).populate('images')
    if(!wishlist) {
        return res.status(400).send({ message: 'Wishlist not found' })
    }

    res.status(200).send({ wishlist })
})


const deleteWishList = asyncHandler(async (req, res) => {
    const { userId } = req.query

    const wishlist =  await WishList.findOneAndDelete({ user: userId })

    if(!wishlist) {
        return res.status(400).send({ message: 'WishList not found' })
    }

    res.status(200).send({ message: 'Wishlist deleted successfully' })
})


const getAllWishLists = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const wishlists = await WishList.find({}).populate('user').populate('images').sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

    if(!wishlists || wishlists.length === 0) {
        return res.status(400).send({ message: 'No WishList exists' })
    }
    const totalDocuments = await WishList.countDocuments({})
    const pageCount = Math.ceil(totalDocuments/pageSize)


    res.status(200).send({ wishlists, pageCount })
})

module.exports = {
    addItemsInWishList,
    removeItemsFromWishList,
    getMyWishList,
    deleteWishList,
    getAllWishLists
}
