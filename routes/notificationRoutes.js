const express = require('express')
const { 
    sendPushNotification,
    sendNotificationToAllUsers,
    sendNotificationToOneUser,
    sendNotificationToChannelUsers,
    sendNotificationsInsideApplicationToSingleUser,
    sendNotificationsInsideApplicationToMultipleUser,
    getNotificationByUserId,
    getNotificationById,
    getNotifications,
    readStatusUpdate,
    deleteNotification,
 } = require('../controller/notificationController.js')

const router = express.Router()

router.post('/send-test-push-notification', sendPushNotification)
router.post('/send-notification-to-all-users', sendNotificationToAllUsers)
router.post('/send-notification-to-one-user', sendNotificationToOneUser)
router.post('/read-status-update', readStatusUpdate)
router.delete('/delete-notifications', deleteNotification)
router.get('/get-notifications-by-user-id', getNotificationByUserId)


module.exports = router