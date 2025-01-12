const asyncHandler = require('express-async-handler')
const Subscription = require('../models/subscriptionModel')
const User = require('../models/userModel')
const Plan = require('../models/planModel')
const Photographer = require('../models/photographerModel')
const UserType = require('../models/typeModel')
const cron = require('node-cron');

const createSubscription = asyncHandler(async (req, res) => {
    const { userId, planId, price } = req.body
    const userType = await UserType.findOne({ user: userId }).select('type -_id')
    const type = userType?.type || null;

    const plan = await Plan.findById(planId);

    if (!userType || !type) {
      return res.status(404).json({ message: 'User related Info not found' });
    }

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const startDate = new Date()
    const endDate = new Date()

    switch (plan.duration) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quaterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'half-yearly':
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          throw new Error('Invalid plan duration');
      }

    
    const newSubscription = new Subscription({
        userInfo: {
            user: userId,
            userType: type
        },
        planId,
        startDate,
        endDate,
        price
      });
    await newSubscription.save()
    res.status(200).send({ subscription: newSubscription })
})

const getUserSubscriptions = asyncHandler(async (req, res) => {
    const { userId } = req.query
    const subscriptions = await Subscription.find({ 'userInfo.user': userId }).populate('planId')

    if (!subscriptions || subscriptions.length === 0) {
        return res.status(404).json({ message: 'No subscriptions found for this user' });
      }
  
    res.status(200).json({
        message: 'Subscriptions retrieved successfully',
        subscriptions
    });
})

const cancelSubscriptions = asyncHandler(async(req, res) => {
    const { id } = req.query

    const subscription = await Subscription.findById(id)

    if(!subscription) return res.status(400).send({ message: 'Subscription not found' })

    subscription.isActive = false;
    subscription.autoRenew = false;
    await subscription.save();
    
    res.status(200).json({
          message: 'Subscription canceled successfully',
          subscription
    });
})

const checkAndUpdateSubscriptions = asyncHandler(async () => {

    const plans = await Plan.find({ name: { $nin: ['Basic'] } });
    const planIds = plans.map((plan) => plan._id);
    const basicPlan = await Plan.findOne({ name: 'Basic' })
    const basicPlanId = basicPlan._id
    const now = Date.now()
    await Subscription.updateMany({
        endDate: { $lte: now },
        isActive: true,
        planId: { $in: planIds }
    }, {
      $set: {
        planId: basicPlanId,
      }
    })
    
})


module.exports = {
    createSubscription,
    getUserSubscriptions,
    cancelSubscriptions,
    checkAndUpdateSubscriptions
}