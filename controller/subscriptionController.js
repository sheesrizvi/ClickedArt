const asyncHandler = require('express-async-handler')
const Subscription = require('../models/subscriptionModel')
const User = require('../models/userModel')
const Plan = require('../models/planModel')
const Photographer = require('../models/photographerModel')
const UserType = require('../models/typeModel')
const cron = require('node-cron');
const Razorpay = require('razorpay');
const { sendMembershipUpgradeMail,  sendMembershipRenewalReminderMail} = require('../middleware/handleEmail.js')

const createSubscription = asyncHandler(async (req, res) => {
    const { userId, planId, price, duration } = req.body
    const userType = await UserType.findOne({ user: userId }).select('type -_id')
    const type = userType?.type || null;

    const plan = await Plan.findById(planId);

    if (!userType || !type) {
      return res.status(404).json({ message: 'User related Info not found' });
    }

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const selectedCost = plan.cost.find(cost => cost.duration === duration && cost.price === price);

    if (!selectedCost) {
      return res.status(400).json({ message: 'Invalid price or duration selected' });
    }

    const startDate = new Date()
    const endDate = new Date()

    switch (duration) {
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
    const subscriptions = await Subscription.find({ 'userInfo.user': userId  }).populate('planId')

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
    const basicPlanId = basicPlan?._id
    const now = Date.now()

    await Subscription.updateMany({
        endDate: { $lt: now },
        isActive: true,
        planId: { $in: planIds }
    }, {
      $set: {
        isActive: false
      }
    })
    
})

const payment = asyncHandler(async (req, res) => {
  const { total, userId } = req.body;

  if (!total || !userId) {
    res.status(400).json({ message: "Total amount and user ID are required." });
    return;
  }

  const user = await Photographer.findById(userId);
  if (!user) {
    res.status(404).json({ message: "Photographer not found." });
    return;
  }

  const instance = new Razorpay({
    key_id: process.env.RAZOR_PAY_ID,
    key_secret: process.env.RAZOR_PAY_SECRET,
  });

  const result = await instance.orders.create({
    amount: total * 100,
    currency: "INR",
    receipt: `receipt_${userId}`,
    notes: {
      userId: user._id,
      key: process.env.RAZOR_PAY_ID,
    },
  });

  res.status(200).json({ result });
});

const getUserActiveSubscription = asyncHandler(async (req, res) => {
    const { photographer } = req.query

      const subscription = await Subscription.findOne({
          'userInfo.user': photographer,
          'userInfo.userType': 'Photographer',
          isActive: true,
        }).populate('planId');
     

    if(!subscription) {
      return res.status(400).send({ message: 'No Active Subscription found for user' })
    }

    res.status(200).send({ subscription })
})


const upgradeSubscriptionByAdminWithRank = asyncHandler(async (req, res) => {
  const { rank, planId, durationNumber , duration , userId } = req.body
  
  const userType = await UserType.findOne({ user: userId }).select('type -_id')
  const type = userType?.type || null;

  const plan = await Plan.findById(planId);

  if (!userType || !type) {
    return res.status(404).json({ message: 'User related Info not found' });
  }

  if (!plan) {
    return res.status(404).json({ message: 'Plan not found' });
  }

  const photographer = await Photographer.findOne({ _id: userId })
  if(!photographer){
      return res.status(400).send({ message: 'Photographer not found' })
    }
  
  const selectedCost = plan.cost.find(cost => cost.duration === duration);

  if (!selectedCost || !selectedCost.price) {
    return res.status(400).json({ message: 'Invalid price or duration selected' });
  }

  const price = (selectedCost.price) * durationNumber

  const startDate = new Date()
  const endDate = new Date()

  switch (duration) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + durationNumber);
      break;
    case 'quaterly':
      endDate.setMonth(endDate.getMonth() + durationNumber);
      break;
    case 'half-yearly':
      endDate.setMonth(endDate.getMonth() + durationNumber);
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + durationNumber);
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

  const basicPlan = await Plan.findOne({ name: 'Basic' })
  const basicPlanId = basicPlan?._id


  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  await Subscription.updateMany({
    _id: { $ne: newSubscription._id },
    'userInfo.user': userId,
    isActive: true
    }, {
      $set: {
        isActive: false
      }
    })

  if(rank) {
    photographer.rank = rank
    await photographer.save()  
  }
  
  
  const photographerEmail = photographer.email
  const photographerName = `${photographer.firstName} ${photographer.lastName}`
  const membershipType = plan.name
  
  sendMembershipUpgradeMail(photographerName, membershipType, photographerEmail)


  res.status(200).send({ message: 'Subscription update successfull', subscription: newSubscription })

})

const upgradeSubscriptionByAdmin = asyncHandler(async (req, res) => {
  const { planId, durationNumber , duration , userId } = req.body
  
  if(!planId || !durationNumber || !duration || !userId) {
    return res.status(400).send({ message: "All Fields are required" })
  }

  const userType = await UserType.findOne({ user: userId }).select('type -_id')

  const type = userType?.type || null;

  const plan = await Plan.findById(planId);

  if (!userType || !type) {
    return res.status(404).json({ message: 'User related Info not found' });
  }

  if (!plan) {
    return res.status(404).json({ message: 'Plan not found' });
  }

  const photographer = await Photographer.findOne({ _id: userId })

  if(!photographer){
    return res.status(400).send({ message: 'Photographer not found' })
  }
  
  const selectedCost = plan.cost.find(cost => cost.duration === duration);

  if (!selectedCost || !selectedCost.price) {
    return res.status(400).json({ message: 'Invalid price or duration selected' });
  }
 
  const price = (selectedCost.price) * durationNumber
  
  const startDate = new Date()
  const endDate = new Date()

  switch (duration) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + durationNumber);
      break;
    case 'quaterly':
      endDate.setMonth(endDate.getMonth() + durationNumber);
      break;
    case 'half-yearly':
      endDate.setMonth(endDate.getMonth() + durationNumber);
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + durationNumber);
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

  const basicPlan = await Plan.findOne({ name: 'Basic'})
  const basicPlanId = basicPlan?._id


  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  await Subscription.updateMany({
    _id: { $ne: newSubscription._id },
    'userInfo.user': userId,
    isActive: true
    }, {
      $set: {
        isActive: false
      }
    })


  
  const photographerEmail = photographer.email
  const photographerName = `${photographer.firstName} ${photographer.lastName}`
  const membershipType = plan.name

  sendMembershipUpgradeMail(photographerName, membershipType, photographerEmail)

  res.status(200).send({  message: 'Subscription update successfull', subscription: newSubscription })
})

const upgradeUserSubscription = asyncHandler(async (req, res) => {
  const { userId, planId, price, duration } = req.body

  const userType = await UserType.findOne({ user: userId }).select('type -_id')
  const type = userType?.type || null;

  const plan = await Plan.findById(planId);

  if (!userType || !type) {
    return res.status(404).json({ message: 'User related Info not found' });
  }

  if (!plan) {
    return res.status(404).json({ message: 'Plan not found' });
  }
 

  const photographer = await Photographer.findOne({ _id: userId })

  if(!photographer){
    return res.status(400).send({ message: 'Photographer not found' })
  }


  const selectedCost = plan.cost.find(cost => cost.duration === duration && cost.price === price);
 
  if (!selectedCost) {
    return res.status(400).json({ message: 'Invalid price or duration selected' });
  }

  const startDate = new Date()
  const endDate = new Date()

  switch (duration) {
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

  const basicPlan = await Plan.findOne({ name: 'Basic'})
  const basicPlanId = basicPlan?._id

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  await Subscription.updateMany({
    _id: { $ne: newSubscription._id },
    'userInfo.user': userId,
    isActive: true
    }, {
      $set: {
        isActive: false
      }
    })
    
  const photographerEmail = photographer.email
  const photographerName = `${photographer.firstName} ${photographer.lastName}`
  const membershipType = plan.name

  sendMembershipUpgradeMail(photographerName, membershipType, photographerEmail)
  res.status(200).send({ subscription: newSubscription })
})

const checkAndSendSubscriptionEmails = asyncHandler(async () => {
    const now = new Date()
    const startRange = new Date()
    startRange.setDate(now.getDate() + 7)

    const endRange = new Date()
    endRange.setDate(now.getDate() + 8)

    const subscriptions = await Subscription.find({ endDate: { $gte: startRange , $lt: endRange}, isActive: true}).populate('userInfo.user')
  
    const emailPromises = subscriptions.map(async (subscription) => {
        const photographerName = `${subscription.userInfo.user.firstName} ${subscription.userInfo.user.lastName}`;
        const photographerEmail = subscription.userInfo.user.email;
        await sendMembershipRenewalReminderMail(photographerName, photographerEmail);
    });

    await Promise.all(emailPromises);

    console.log(`Email Sent for Renew Subscription before expiry`)
})


const checkAndSendExpirySubscriptionEmails = asyncHandler(async () => {
  const now = new Date()
  const startRange = new Date()
  startRange.setDate(now.getDate() + 1)

  const endRange = new Date()
  endRange.setDate(now.getDate() + 2)
  
  const subscriptions = await Subscription.find({ endDate: { $gte: startRange , $lt: endRange}, isActive: true}).populate('userInfo.user')

  const emailPromises = subscriptions.map(async (subscription) => {
      const photographerName = `${subscription.userInfo.user.firstName} ${subscription.userInfo.user.lastName}`;
      const photographerEmail = subscription.userInfo.user.email;
      await sendMembershipRenewalReminderMail(photographerName, photographerEmail);
  });

  await Promise.all(emailPromises);

  console.log(`Email Sent for Renew Subscription before expiry`)
})



module.exports = {
    createSubscription,
    getUserSubscriptions,
    cancelSubscriptions,
    checkAndUpdateSubscriptions,
    payment,
    getUserActiveSubscription,
    upgradeSubscriptionByAdminWithRank,
    upgradeSubscriptionByAdmin,
    upgradeUserSubscription,
    checkAndSendSubscriptionEmails,
    checkAndSendExpirySubscriptionEmails
}


