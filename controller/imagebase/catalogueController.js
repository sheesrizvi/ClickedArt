const Catalogue = require('../../models/imagebase/catalogueModel.js')
const asyncHandler = require('express-async-handler');

const createCatalogue = asyncHandler(async (req, res) => {
    const { name, description, photographer, images } = req.body;
    const catalogueExist = await Catalogue.findOne({ name, photographer })
    if(catalogueExist) {
        return res.status(400).send({ message: 'Catalogue already exist with same name for photographer' })
    }
    const catalogue = new Catalogue({ name, description, photographer, images })
    await catalogue.save();
    res.status(200).send({message: 'Catalogue created Successfully', catalogue})
})

const getAllCatalogues = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const catalogues = await Catalogue.find().populate('photographer').populate({
        path: 'images',
        populate: [{
            path: 'category'
        },
        {
            path: 'photographer'
        },
        {
            path: 'license'
        }
    ]
    }).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

    if(!catalogues || catalogues.length === 0) {
        return res.status(400).send({ message: 'Catalogue not Exist' })
    }

    const totalDocuments = await Catalogue.countDocuments({})
    const pageCount = Math.ceil(totalDocuments/pageSize)

    
    res.status(200).send({catalogues, pageCount});
})

const getCatalogueByPhotographer = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20, photographer } = req.query

    const catalogues = await Catalogue.find({ photographer }).populate('photographer').populate({
        path: 'images',
        populate: [{
            path: 'category'
        },
        {
            path: 'photographer'
        },
        {
            path: 'license'
        }
    ]
    }).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)

    if(!catalogues || catalogues.length === 0) {
        return res.status(400).send({ message: 'Catalogue not Exist' })
    }

    const totalDocuments = await Catalogue.countDocuments({ photographer })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    
    res.status(200).send({catalogues, pageCount})
})

const getCatalogueById = asyncHandler(async (req, res) => {
    const { catalogueId } = req.query
    const catalogue = await Catalogue.findById(catalogueId).populate('photographer').populate({
        path: 'images',
        populate: [{
            path: 'category'
        },
        {
            path: 'photographer'
        },
        {
            path: 'license'
        }
    ]
    })

    if (!catalogue) {
        res.status(404);
        throw new Error('Catalogue not found')
    }
    res.status(200).json({catalogue})
})

const updateCatalogue = asyncHandler(async (req, res) => {
    const { catalogueId, name, description, photographer, images } = req.body
    const catalogue = await Catalogue.findOne({_id: catalogueId, photographer})
    if (!catalogue) {
        res.status(404);
        throw new Error('Catalogue not found')
    }
    catalogue.name = name || catalogue.name;
    catalogue.description = description || catalogue.description
    if (images) {
        catalogue.images = [...catalogue.images, ...images]
    }
    await catalogue.save()
    res.status(200).send({ message: 'Catalogue updated successfully', catalogue })
})

const deleteCatalogue = asyncHandler(async (req, res) => {
    const { catalogueId } = req.query
    const catalogue = await Catalogue.findById(catalogueId)
    if (!catalogue) {
        res.status(404)
        throw new Error('Catalogue not found');
    }
    await Catalogue.findOneAndDelete({ _id: catalogueId })
    res.status(200).send({ message: 'Catalogue removed' })
})


const removeImagesFromCatalogue = asyncHandler(async (req, res) => {
    const { catalogueId, imagesToRemove } = req.body
    console.log(req.query)
    const catalogue = await Catalogue.findById(catalogueId)
    if (!catalogue) {
        res.status(404);
        throw new Error('Catalogue not found');
    }

    catalogue.images = catalogue.images.filter(
        (imageId) => !imagesToRemove.includes(imageId.toString())
    );

    await catalogue.save();

    res.status(200).send({ message: 'Images removed successfully', catalogue });
})

const searchCatalogues = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20, Query, photographer } = req.query

    const catalogues = await Catalogue.find({
        $and: [
            {
                $or: [
                    { name: { $regex: Query, $options: 'i' }},
                    { description: { $regex: Query, $options: 'i' } }
                 ]
            },
            {
                photographer
            }
        ]
        
    }).populate('photographer').populate({
        path: 'images',
        populate: [{
            path: 'category'
        },
        {
            path: 'photographer'
        },
        {
            path: 'license'
        }
    ]
    }).skip((pageNumber -1) * pageSize).limit(pageSize)
    if(!catalogues || catalogues.length === 0) {
        return res.status(400).send({ message: 'Catalogue not found' })
    }
    const totalDocuments = await Catalogue.countDocuments({
        $and: [
            {
                $or: [
                    { name: { $regex: Query, $options: 'i' }}
                 ]
            },
            {
                photographer
            }
        ]
    })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ catalogues, pageCount })
})

module.exports = {
    createCatalogue,
    getAllCatalogues,
    getCatalogueByPhotographer,
    getCatalogueById,
    updateCatalogue,
    removeImagesFromCatalogue,
    deleteCatalogue,
    searchCatalogues
}