const express = require('express')
const {  
    addItemsInWishList,
    removeItemsFromWishList,
    getMyWishList,
    deleteWishList,
    getAllWishLists } = require('../controller/wishlistController')

const router = express.Router()

router.post('/add-images-in-wishlist', addItemsInWishList)
router.post('/remove-images-from-wishlist', removeItemsFromWishList)
router.get('/get-my-wishlist', getMyWishList)
router.get('/get-wishlist', getAllWishLists)
router.delete('/delete-wishlist', deleteWishList)


module.exports = router