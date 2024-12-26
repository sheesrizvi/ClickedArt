const asyncHandler = require('express-async-handler');
const OrderSupport = require('../models/OrderSupport');

const createOrderSupport = asyncHandler(async (req, res) => {
    const {
        userInfo,
        order,
        issueType,
        issueDescription,
        preferredContactMethod,
    } = req.body;

    const checkSupportExist = await OrderSupport.findOne({ order })

    if(checkSupportExist) {
        return res.status(400).send({ message : 'Support already exist on this order' })
    }

    const orderSupport = await OrderSupport.create({
        userInfo,
        order,
        issueType,
        issueDescription,
        preferredContactMethod,
    });

    res.status(201).json({orderSupport});
});

const getPendingOrderSupportRequests = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query;
    
    const { customRequests, totalDocuments } = await Promise.all([
        OrderSupport.find({ $or: [ { status: 'review' }, { status: 'pending' } ]}).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize),
        OrderSupport.countDocuments({ $or: [ { status: 'review' }, { status: 'pending' } ]})
    ])

    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).json({ customRequests, pageCount });
});

const getResolvedOrderSupportRequests = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query;
    
    const { customRequests, totalDocuments } = await Promise.all([
        OrderSupport.find({ status: 'approved' }).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize),
        OrderSupport.countDocuments({ status: 'approved'})
    ])

    const pageCount = Math.ceil(totalDocuments/pageSize)

    res.status(200).json({ customRequests, pageCount });
});

const getOrderSupportById = asyncHandler(async (req, res) => {
    const { orderId } = req.query;
    const orderSupport = await OrderSupport.findOne({ order: orderId }).populate('userInfo.user').populate('order');
    if(!orderSupport){
        return res.status(400).send({ message: 'Order Support not exists' })
    }
    res.status(200).json({orderSupport});
});

const updateOrderSupport = asyncHandler(async (req, res) => {
    const {
        userId,
        orderId,
        issueType,
        issueDescription,
        preferredContactMethod,
    } = req.body;
  
    const orderSupport = await OrderSupport.findOne(
        {
            order: orderId,
            'userInfo.user': userId
        }
    );

    orderSupport.issueType = issueType || orderSupport.issueType
    orderSupport.issueDescription = issueDescription || orderSupport.issueDescription
    orderSupport.preferredContactMethod = preferredContactMethod || orderSupport.preferredContactMethod
    
    res.status(200).json({orderSupport});
});

const deleteOrderSupport = asyncHandler(async (req, res) => {
    const { orderId } = req.query;
    const orderReportExist = await OrderSupport.findOne({ order })

    if(!orderReportExist) {
        return res.status(400).send({ message : 'Order Support not exist on this order' })
    }

    await OrderSupport.findOneAndDelete({ order: orderId });
    res.status(200).send({ message: 'Order Support Deleted Successfully' })
});

const changeOrderSupportStatus = asyncHandler(async (req, res) => {
    const { status, orderId } = req.query

    const validStatusTypes = ['pending', 'review', 'approved', 'rejected']

    if(!validStatusTypes.includes(status)) {
        return res.status(400).send({ message: 'Not a Valid Status' })
    }

    const orderReport = await OrderSupport.findOne({ order: orderId })

    orderReport.status = status 

    await orderReport.save()

    res.status(200).send({ message: 'Order Report Status changed successfully' })
})

module.exports = {
    createOrderSupport,
    getPendingOrderSupportRequests,
    getResolvedOrderSupportRequests,
    getOrderSupportById,
    updateOrderSupport,
    deleteOrderSupport,
    changeOrderSupportStatus
};
