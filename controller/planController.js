const asyncHandler = require('express-async-handler')
const Plan = require('../models/planModel')

const addPlan = asyncHandler(async (req, res) => {
    const { name, userType, price, isAdFree, downloadLimit, priorityAccess, 
        promotionalTools, analyticsAccess, allowedImageResolutions, duration, description, level } = req.body;


        const newPlan = new Plan({
            name,
            userType,
            price,
            isAdFree,
            downloadLimit,
            priorityAccess,
            promotionalTools,
            analyticsAccess,
            allowedImageResolutions,
            duration,
            description,
            level
          });
      
          const savedPlan = await newPlan.save();
          res.status(201).json({ message: 'Plan created successfully', plan: savedPlan });
})

const updatePlan = asyncHandler(async (req, res) => {
    
    const { 
        id, name,
        userType,
        price,
        isAdFree,
        downloadLimit,
        priorityAccess,
        promotionalTools,
        analyticsAccess,
        allowedImageResolutions,
        duration,
        description,
        level
    } = req.body

    const plan = await Plan.findById(id)
    if(!plan) return res.status(400).send({ message: 'Plan not found' })
    
    plan.name = name || plan.name
    plan.userType = userType || plan.userType
    plan.price = price || plan.price
    plan.isAdFree = isAdFree || plan.isAdFree
    plan.downloadLimit = downloadLimit || plan.downloadLimit
    plan.priorityAccess = priorityAccess || plan.priorityAccess
    plan.promotionalTools = promotionalTools || plan.promotionalTools
    plan.analyticsAccess = analyticsAccess || plan.analyticsAccess
    plan.allowedImageResolutions = allowedImageResolutions || plan.allowedImageResolutions
    plan.duration = duration || plan.duration
    plan.description = description || plan.description
    plan.level = level || plan.level

    await plan.save()

    res.status(201).json({ message: 'Plan updated successfully', plan });

})

const deletePlan = asyncHandler(async (req, res) => {
    const { id } = req.query
    if(!id) return res.status(400).send({ message: 'Id not found' })

    const plan = await Plan.findById(id)
    if(!plan) return res.status(400).send({ message: 'Plan not found' })

    await Plan.findByIdAndDelete(id)
    res.status(200).send({ message: 'Plan deleted successfully' })
})

const getAllPlans = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20} = req.query

    const plans = await Plan.find({}).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
    if(!plans || plans.length === 0) return res.status(400).send({ message: 'No Plan found' })
    
    const totalDocuments = await Plan.countDocuments({})
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ plans, pageCount })


})

const getPlansByUserType = asyncHandler(async (req, res) => {
    const { userType = 'User', pageNumber = 1, pageSize = 20} = req.query

    const plans = await Plan.find({ userType }).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize)
    if(!plans || plans.length === 0) return res.status(400).send({ message: 'No Plan found' })
    
    const totalDocuments = await Plan.countDocuments({ userType })
    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).send({ plans, pageCount })

})



const getPlanById = asyncHandler(async (req, res) => {
    const { id } = req.query

    const plan = await Plan.findById(id)

    if(!plan) return res.status(400).send({ message: 'No Plan found' })

    res.status(200).send({ plan })
})

module.exports = {
    addPlan,
    updatePlan,
    deletePlan,
    getAllPlans,
    getPlanById,
    getPlansByUserType
}