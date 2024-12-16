const asyncHandler = require('express-async-handler');
const Plan = require('../models/planModel.js');

const createPlan = asyncHandler(async (req, res) => {
    const { name, cost, imageUploadLimit, catalogCreation, watermarkingTools, salesReports, licensingOptions, socialMediaIntegration, socialMediaAutoPosting, prioritySupport, advancedTools, promotionalTools, trialPeriod} = req.body 

    const plan = await Plan.create({
        name, 
        cost, 
        imageUploadLimit, 
        catalogCreation, 
        watermarkingTools, 
        salesReports, 
        licensingOptions, 
        socialMediaIntegration, 
        socialMediaAutoPosting, 
        prioritySupport, 
        advancedTools, 
        promotionalTools, 
        trialPeriod
    })

    await plan.save();
    res.status(201).send({ plan });
});

const getAllPlans = asyncHandler(async (req, res) => {
    const plans = await Plan.find({})

    res.status(200).json({ plans })
})

const getPlanById = asyncHandler(async (req, res) => {
    const plan = await Plan.findById(req.query.id)

    if (!plan) {
        return res.status(404).json({ error: 'Plan not found' })
    }
    res.status(200).json({ plan })
})

const updatePlan = asyncHandler(async (req, res) => {
    const { planId, name, cost, imageUploadLimit, catalogCreation, watermarkingTools, salesReports, licensingOptions, socialMediaIntegration, socialMediaAutoPosting, prioritySupport, advancedTools, promotionalTools, trialPeriod  } = req.body
    
    const plan = await Plan.findByIdAndUpdate(planId);
   
    if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
    }

    plan.name = name || plan.name
    plan.cost = cost || plan.cost
    plan.imageUploadLimit = imageUploadLimit || plan.imageUploadLimit
    plan.catalogCreation = catalogCreation || plan.catalogCreation
    plan.watermarkingTools = watermarkingTools || plan.watermarkingTools
    plan.salesReports = salesReports || plan.salesReports
    plan.licensingOptions = licensingOptions || plan.licensingOptions
    plan.socialMediaIntegration = socialMediaIntegration || plan.socialMediaIntegration
    plan.socialMediaAutoPosting = socialMediaAutoPosting || plan.socialMediaAutoPosting
    plan.prioritySupport = prioritySupport || plan.prioritySupport
    plan.advancedTools = advancedTools || plan.advancedTools
    plan.promotionalTools = promotionalTools || plan.promotionalTools
    plan.trialPeriod = trialPeriod || plan.trialPeriod

    await plan.save()

    res.status(200).send({ plan })
})

const deletePlan = asyncHandler(async (req, res) => {
    const plan = await Plan.findByIdAndDelete(req.query.id);
    if (!plan) {
        return res.status(404).json({ error: 'Plan not found' })
    }
    res.status(200).json({ message: 'Plan deleted successfully' })
})


module.exports = {
    createPlan,
    getAllPlans,
    getPlanById,
    updatePlan,
    deletePlan
}