const Category = require('../models/categoryModel')
const asyncHandler = require('express-async-handler')

const createCategory = asyncHandler(async (req, res) => {
    const { name, description, coverImage, tags } = req.body

    const categoryExist = await Category.findOne({  name })
    if(categoryExist) return res.status(400).send({ message: 'Category already exist with this name' })

    const category = await Category.create({
        name,
        description,
        coverImage,
        tags
    })

    res.status(200).send({ category })
})


const updateCategory = asyncHandler(async (req, res) => {
    const { id, name, description, coverImage, tags  } = req.body
    
    const category = await Category.findOne({  _id: id })
    if(!category) return res.status(400).send({ message: 'Category not exist' })

    category.name = name || category.name
    category.description = description || category.description
    category.coverImage = coverImage || category.coverImage
    category.tags = tags || category.tags

    await category.save()
    
    res.status(200).send({ category })
})

const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.query

  
    const category = await Category.findOne({  _id: id })
    if(!category) return res.status(400).send({ message: 'Category not exist' })

     // image exist check under this category logic
    // Delete from AWS 

    await Category.findOneAndDelete({ _id: id })

    res.status(200).send({ message: 'Category deleted successfully' })

})

const getCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.query
    const category = await Category.findOne({  _id: id })
    if(!category) return res.status(400).send({ message: 'Category not exist' })

    res.status(200).send({ category })
})

const getAllCategory = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query
    const totalDocuments = await Category.countDocuments({})
    const pageCount = Math.ceil(totalDocuments/pageSize)

    const categories = await Category.find({}).skip((pageNumber - 1) * pageSize).limit(pageSize)
    if(!categories || categories.length === 0) return res.status(400).send({ message: 'Category not exist' })
    
    res.status(200).send({ categories, pageCount })
})

module.exports = {
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getAllCategory
}