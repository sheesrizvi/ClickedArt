const Category = require('../models/categoryModel')
const asyncHandler = require('express-async-handler')
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { S3Client } = require("@aws-sdk/client-s3");

const config = {
    region: process.env.AWS_BUCKET_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
  };
const s3 = new S3Client(config);
  

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
    f1 = category?.coverImage || undefined

    if (f1) {
        const fileName = f1.split("//")[1].split("/")[1];
        const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: fileName,
        });
        const response = await s3.send(command);

    }

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



const searchCategories = async (req, res) => {
  const { Query, pageNumber = 1, pageSize = 20 } = req.query;  
  
  if(!Query) {
    return res.status(400).send({ message: 'Query is required' })
  }
    const results = await Category.aggregate([
      {
        $search: {
          index: 'categoryIndex',  
          text: {
            query: Query,
            path: ['name', 'tags', 'description'],
            fuzzy: {
              maxEdits: 2,
              prefixLength: 3
            }
          }
        }
      },
      {
        $skip: (pageNumber - 1) * pageSize
      },
      {
        $limit: pageSize
      }
    ]);
    
    const totalDocuments = await Category.aggregate([
        {
            $search: {
              index: 'photographerindex',
              text: {
                query: Query,
                path: ['firstName', 'lastName', 'email', 'bio'],
                fuzzy: {
                  maxEdits: 2,
                  prefixLength: 3
                }
              }
            }
          },
          { $count: "total" }
      ])


      const total = totalDocuments.length > 0 ? totalDocuments[0].total : 1
      const pageCount = Math.ceil(total/pageSize)
      res.status(200).send({ results, pageCount })

};


module.exports = {
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getAllCategory,
    searchCategories
}