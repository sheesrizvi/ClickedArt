const mongoose = require('mongoose')

const orderSupportFormSchema = mongoose.Schema({
        userInfo: { // primary user info
            user: { type: mongoose.Schema.Types.ObjectId, refPath: 'userInfo.userType', required: true }, 
            userType: { type: String, enum: ['User', 'Photographer'], required: true },
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true
        },
        issueType: {
            type: String,
            enum: [ 'Order not received', 'Wrong item received', 'Damaged Item', 'Payment issue', 'Request for cancellation or refund', 'Digital Download Issue' ,'Other' ],
            required: true
        },
        issueDescription: {
            type: String,
            required: true
        },
        preferredContactMethod: {
            type: String,
            enum: ['Email', 'Phone', 'Chat']
        },
        status: {
            type: String,
            enum: ['pending', 'review', 'approved', 'rejected'],
            default: 'pending',
        },
})  

const OrderSupport = mongoose.model('OrderSupport', orderSupportFormSchema)

module.exports = OrderSupport