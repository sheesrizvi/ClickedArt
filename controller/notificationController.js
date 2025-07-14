const asyncHandler = require('express-async-handler')
const User = require('../models/userModel.js')
const firebaseAdmin = require('../middleware/firebase.js')
const Notification = require('../models/notificationModel.js')
const Photographer = require('../models/photographerModel.js')
const Follow = require('../models/socials/followModel.js')

const sendPushNotification = asyncHandler(async (req, res) => {
    const { title, body, image, token } = req.body

    const message = {
        notification: {
          title,
          body
        },
        data: {
          title,
          body,
          image
        },
        android: {
          notification: {
            imageUrl: image,
          },
        },
        apns: {
            payload: {
              aps: {
                'mutable-content': 1
              }
            },
            fcm_options: {
              image: image
            }
          },
        webpush: {
          headers: {
            image
          }
        },
        tokens: [token]
      }

    
    const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
    return res.status(200).send({ message: response });
    
});


const sendNotificationToAllUsers = asyncHandler(async (req, res) => {

  const {
    title, body, image, userType
  } = req.body;
  
  const Model = userType === 'User' ? User : Photographer

  let users = await Model.find({ pushToken: { $exists: true, $ne: null } });
  const tokens = users.map((user) => user.pushToken);

  const message = {
    notification: { title, body },
    data: { title, body },
    tokens
  };

  if (image) {
    message.data.image = image;

    message.android = {
      notification: {
        imageUrl: image
      }
    };

    message.apns = {
      payload: {
        aps: {
          'mutable-content': 1
        }
      },
      fcm_options: {
        image
      }
    };

    message.webpush = {
      headers: {
        image
      }
    };
  }

 
  let response
  try {
    response = await firebaseAdmin.messaging().sendEachForMulticast(message);
    console.log(response)
  } catch(e) {

    console.log(e)
  }
 
  const usersInfo = [];
  
  response.responses.forEach((resp, index) => {
      const user = users[index];

      if (resp.success && user) {
          usersInfo.push({
              user: user._id,
              userType: userType,
              isRead: false
          });
      }

       if (!resp.success) {
        console.error(`Error sending to device ${index}:`, resp.error);
      }
  });

  if (usersInfo.length === 0) {
    return res.status(400).send({ message: 'Not able to notify users. Please check pushToken' });
  }

  const notifications = await Notification.create({
      usersInfo: usersInfo,
      message: {
          title,
          body,
           ...(image && { image }), 
      }
  });

  res.status(200).send({ message: 'Notification sent successfully', response, notifications });
});


const sendNotificationToGroupUsers = asyncHandler(async (req, res) => {
  const {
    title, body, image, selectedUsers
  } = req.body;

  let users = await User.find({ _id: { $in: selectedUsers } });
 
  const tokens = users.map((user) => user.pushToken);

const message = {
    notification: {
      title,
      body,
    },
    data: {
      title,
      body,
      ...(image && { image }),
    },
    ...(image && {
      android: {
        notification: {
          imageUrl: image,
        },
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
          },
        },
        fcm_options: {
          image,
        },
      },
      webpush: {
        headers: {
          image,
        },
      },
    }),
    tokens,
  };


  const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
  const usersInfo = [];
  
  response.responses.forEach((resp, index) => {
      const user = users[index];

      if (resp.success && user) {
          usersInfo.push({
              user: user._id,
              isRead: false
          });
      }
  });

  if (usersInfo.length === 0) {
    return res.status(400).send({ message: 'Not able to notify users. Please check pushToken' });
  }

  const notifications = await Notification.create({
      usersInfo: usersInfo,
      message: {
          title,
          body,
          ...(image && { image }),
          // image
      }
  });

  res.status(200).send({ message: 'Notification sent successfully', response, notifications });
});


const sendNotificationToChannelUsers = asyncHandler(async (req, res) => {
  const {
    title, body, image, channelId
  } = req.body;

  let subscriptions = await Subscription.find({ channel : channelId, isActive: true, status: 'active' }).populate('user')

  if(!subscriptions || subscriptions.length === 0) {
    return res.status(400).send({ message: 'Subscription not found' })
  }


  let users = subscriptions.map((subscription) => subscription.user)
  users = users.filter((user) => user && user.pushToken)
  const tokens = users.map((user) => user.pushToken);
  

 const message = {
    notification: {
      title,
      body,
    },
    data: {
      title,
      body,
      ...(image && { image }),
    },
    ...(image && {
      android: {
        notification: {
          imageUrl: image,
        },
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
          },
        },
        fcm_options: {
          image,
        },
      },
      webpush: {
        headers: {
          image,
        },
      },
    }),
    tokens,
  };


  const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
  const usersInfo = [];
  
  response.responses.forEach((resp, index) => {
      const user = users[index];

      if (resp.success && user) {
          usersInfo.push({
              user: user._id,
              isRead: false
          });
      }
  });

  if (usersInfo.length === 0) {
    return res.status(400).send({ message: 'Not able to notify users. Please check pushToken' });
  }

  const notifications = await Notification.create({
      usersInfo: usersInfo,
      message: {
          title,
          body,
          ...(image && { image }), 
      }
  });

  res.status(200).send({ message: 'Notification sent successfully', response, notifications });
});


const sendNotificationToCampaignUsers = asyncHandler(async (req, res) => {
  const {
    title, body, image, campaignId
  } = req.body;

  let campaign = await Campaign.find({ _id: campaignId });

  if(!campaign) {
    return res.status(400).send({ message: 'Campaign not found' })
  }

  const usersPortfolios = await UserCampaignPortfolio.find({ campaign }).populate('user')
  const users = usersPortfolios.map((portfolio) => portfolio.user)
  
  const tokens = users.map((user) => user.pushToken);

  const message = {
      notification: {
          title,
          body
      },
      data: {
          title,
          body,
          image
      },
      android: {
          notification: {
              imageUrl: image,
          },
      },
      apns: {
          payload: {
              aps: {
                  'mutable-content': 1
              }
          },
          fcm_options: {
              image: image
          }
      },
      webpush: {
          headers: {
              image
          }
      },
      tokens
  };

  const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
  const usersInfo = [];
  
  response.responses.forEach((resp, index) => {
      const user = users[index];

      if (resp.success && user) {
          usersInfo.push({
              user: user._id,
              isRead: false
          });
      }
  });

  if (usersInfo.length === 0) {
    return res.status(400).send({ message: 'Not able to notify users. Please check pushToken' });
  }

  const notifications = await Notification.create({
      usersInfo: usersInfo,
      message: {
          title,
          body,
          image
      }
  });

  res.status(200).send({ message: 'Notification sent successfully', response, notifications });
});

const sendNotificationToOneUser = asyncHandler(async (req, res) => {
  const { id, title, body, image, userType } = req.body;
  
  const Model = userType === 'User' ? User : Photographer


  const user = await Model.findOne({ _id: id, pushToken: { $exists: true, $ne: null } });

  if (!user) return res.status(400).send({ message: 'User not found' });
  const token = user.pushToken;
 
  const message = {
    notification: {
      title,
      body,
    },
    data: {
      title,
      body,
      ...(image && { image }), 
    },
    ...(image && {
      android: {
        notification: {
          imageUrl: image,
        },
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
          },
        },
        fcm_options: {
          image,
        },
      },
      webpush: {
        headers: {
          image,
        },
      },
    }),
    token,
  };

  const response = await firebaseAdmin.messaging().send(message);
  
  const notifications = await Notification.create({
      usersInfo: [{
          user: user._id,
          userType: "User",
          isRead: false
      }],
      message: {
          title,
          body,
          ...(image && { image }), 
      }
  });

  res.status(200).send({ message: 'Notification sent successfully', response, notifications });
});



const sendNotificationsInsideApplicationToSingleUser = asyncHandler(async (userId, userType, title, body) => {

  const Model = userType === 'User' ? User : Photographer

  const user = await Model.findOne({ _id: userId, pushToken: { $exists: true, $ne: null } })

  if(!user) return 
  const token = user.pushToken
  if(!token) return 
  try {
    const message = {
      notification: {
        title,
        body
      },
      data: {
        title,
        body,
      },
      token
    };
      const response = await firebaseAdmin.messaging().send(message);
      
  await Notification.create({
        usersInfo: [{
          user: userId,
          userType: user.type,
          isRead: false
      }],
        message: {
          title,
          body
      }
      });
      return
  } catch(e) {
      console.log('Error sending single user notification')
      return 
  }
});


const sendNotificationsInsideApplicationToMultipleUser = asyncHandler(async (users, msg) => {
  const tokens = users.map(user => user.pushToken)
  const {title, body} = msg
  const message = {
    notification: {
      title,
      body
    },
    data: {
      title,
      body
    },
    tokens
  };
   
    const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
    const unNotifiedUsers = [];
    const notifiedUsers = []
    response.responses.forEach((resp, index) => {
        if (!resp.success) {
            const user = users[index]; 
            if (user) {
                unNotifiedUsers.push(user._id);
            }
        }
        if (resp.success) {
          const user = users[index]; 
          if (user) {
              notifiedUsers.push({user: user._id, isRead: false});
          }
      }
    });
    const notification = { title, body };
  
    const notifications = await Notification.create({
        users: notifiedUsers,
        message: notification
    });

    return `Notification Sent Status ${response} ${notifications}`;
});

const getNotificationById = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const notification = await Notification.findById(id).populate('usersInfo.user');
  if (!notification) return res.status(400).send({ message: "No Notification Found" });

  res.status(200).send(notification);
});

const getNotificationByUserId = asyncHandler(async (req, res) => {
  const { userId, pageNumber = 1, pageSize = 20 } = req.query;

  const notifications = await Notification.find({ 'usersInfo.user': userId }).sort({ createdAt: -1 }).populate('usersInfo.user').skip((pageNumber - 1) * pageSize)
  if (!notifications || notifications.length === 0) return res.status(400).send({ message: "No Notifications Found" });

  const totalDocuments = await Notification.countDocuments({ 'userInfo.user': userId })
  const pageCount = Math.ceil(totalDocuments/pageSize)
  res.status(200).send({ notifications, pageCount });
});

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({}).sort({ createdAt: -1 }).populate('usersInfo.user');
  if (notifications.length === 0) return res.status(400).send({ message: "No Notifications Found" });

  res.status(200).send({ message: 'Notifications', notifications });
});

const readStatusUpdate = asyncHandler(async (req, res) => {
  const { notificationId, userId, read } = req.body;

  const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, 'usersInfo.user': userId },
      { $set: { 'usersInfo.$.isRead': read } },
      { new: true }
  );

  if (!notification) return res.status(400).send({ message: "Read status update failed, please check details." });

  res.status(200).send({ message: "Notification read status updated successfully", notification });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.query;

  const notification = await Notification.findById(notificationId);
  if (!notification) return res.status(400).send({ message: "Notification not found" });

  await Notification.findByIdAndDelete(notificationId);
  res.status(200).send({ message: "Notification deleted successfully", notification });
});

const searchNotifications = asyncHandler(async (req, res) => {
    const { Query, pageNumber = 1, pageSize = 20 } = req.query;
 
    try {

      const notifications = await Notification.find({
        $or: [
          { 'message.title': { $regex: Query, $options: 'i' } },
          { 'message.body': { $regex: Query, $options: 'i' } },
        ],
      })
        .sort({ createdAt: -1 })        
        .skip((pageNumber - 1) * pageSize) 
        .limit(parseInt(pageSize));      
      
    
      
      const totalDocuments = await Notification.countDocuments({
        $or: [
          { 'message.title': { $regex: Query, $options: 'i' } },
          { 'message.body': { $regex: Query, $options: 'i' } },
        ],
      });
  
      if (!notifications || notifications.length === 0) {
        return res.status(404).send({ message: 'Notifications not found' });
      }
  
      const pageCount = Math.ceil(totalDocuments / pageSize);
  
      res.status(200).send({ 
        notifications, 
        pageCount, 
        totalDocuments,
        currentPage: pageNumber 
      });
    } catch (error) {
      console.error('Error searching notifications:', error);
      res.status(500).send({ message: 'Server error' });
    }
  });
  

const sendOrderNotification = asyncHandler(async (id, title, body ) => {

  try {

    const userType = await UserType.findOne({ user: id }).select('type -_id')

    if(!userType || !userType.type) {
      return false
    }

    const type = userType.type
  
    const Model = type === 'User' ? User : Vendor
  
    const user = await Model.findOne({ _id: id, pushToken: { $exists: true, $ne: null } });
  
    if (!user) return res.status(400).send({ message: 'User not found' });
    const token = user.pushToken;
   
    const message = {
      notification: {
        title,
        body
      },
      data: {
        title,
        body,
      },
      token
    };
  
  
    
    const response = await firebaseAdmin.messaging().send(message);
    
    const notifications = await Notification.create({
        usersInfo: [{
            user: user._id,
            userType: type,
            isRead: false
        }],
        message: {
            title,
            body
        }
    });
  
    return true

  } catch(e) {
    console.log('Error sending Order Notification') 
    return false
  }
  
  
});


const sendBookingNotification = asyncHandler(async (id, title, body) => {
  
  try {

    const userType = await UserType.findOne({ user: id }).select('type -_id')

    if(!userType || !userType.type) {
      return false
    }
    
    const type = userType.type
  
    const Model = type === 'User' ? User : Vendor
  
    const user = await Model.findOne({ _id: id, pushToken: { $exists: true, $ne: null } });
  
    if (!user) return res.status(400).send({ message: 'User not found' });
    const token = user.pushToken;
   
    const message = {
      notification: {
        title,
        body
      },
      data: {
        title,
        body,
      },
      token
    };
  
    
    const response = await firebaseAdmin.messaging().send(message);
    
    const notifications = await Notification.create({
        usersInfo: [{
            user: user._id,
            userType: type,
            isRead: false
        }],
        message: {
            title,
            body
        }
    });
  
    return true

  } catch(e) {
    console.log('Error sending Booking Notification') 
    return false
  }
  
});

const sendNotificationToSubscribedUsers = asyncHandler(async ( id, title, body, image) => {
  try {
  const user = await User.findOne({ _id: id, pushToken: { $exists: true, $ne: null } });

  if (!user) return false
  const token = user.pushToken;
 
  const message = {
      notification: {
          title,
          body
      },
      data: {
          title,
          body,
          image
      },
      android: {
          notification: {
              imageUrl: image,
          },
      },
      apns: {
          payload: {
              aps: {
                  'mutable-content': 1
              }
          },
          fcm_options: {
              image: image
          }
      },
      webpush: {
          headers: {
              image
          }
      },
      token
  };

  const response = await firebaseAdmin.messaging().send(message);
  
  const notifications = await Notification.create({
      usersInfo: [{
          user: user._id,
          isRead: false
      }],
      message: {
          title,
          body,
          image
      }
  });

  
  } catch(e) {
    console.log('Error sending Notification', e) 
   
  }
})

const sendSingleUserNotification = asyncHandler(async ( id, title, body, image) => {
  try {
  const user = await User.findOne({ _id: id, pushToken: { $exists: true, $ne: null } });

  if (!user) return false
  const token = user.pushToken;
 
  const message = {
      notification: {
          title,
          body
      },
      data: {
          title,
          body,
          image
      },
      android: {
          notification: {
              imageUrl: image,
          },
      },
      apns: {
          payload: {
              aps: {
                  'mutable-content': 1
              }
          },
          fcm_options: {
              image: image
          }
      },
      webpush: {
          headers: {
              image
          }
      },
      token
  };

  const response = await firebaseAdmin.messaging().send(message);
  
  const notifications = await Notification.create({
      usersInfo: [{
          user: user._id,
          isRead: false
      }],
      message: {
          title,
          body,
          image
      }
  });

  
  } catch(e) {
    console.log('Error sending Notification', e) 
   
  }
})


const sendIntNotificationToChannelUsers = asyncHandler(async ( title, body, image, channelId) => {
 try {
 
  const channel = await Channel.findOne({ _id: channelId })
  if(!channel) return 
  
 let users
 
 if(channel.type === "free") {
   users = await User.find({ isActive: true })
   console.log("free notifications")
 } else {
  console.log("paid notifications")
  let subscriptions = await Subscription.find({ channel : channelId, isActive: true, status: 'active' }).populate('user')

  if(!subscriptions || subscriptions.length === 0) {
    return
  }

  // users = subscriptions.map((subscription) => subscription.user)
  users = subscriptions
  .filter(subscription =>
    subscription.user &&
    (subscription.user.aadharVerified || subscription.user.panVerified)
  )
  .map(subscription => subscription.user);
  
 }
 
  users = users.filter((user) => user && user.pushToken)
  const tokens = users.map((user) => user.pushToken);
 
  const message = {
      notification: {
          title,
          body
      },
      data: {
          title,
          body,
          image
      },
      android: {
          notification: {
              imageUrl: image,
          },
      },
      apns: {
          payload: {
              aps: {
                  'mutable-content': 1
              }
          },
          fcm_options: {
              image: image
          }
      },
      webpush: {
          headers: {
              image
          }
      },
      tokens
  };

  const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
  const usersInfo = [];
  
  response.responses.forEach((resp, index) => {
      const user = users[index];

      if (resp.success && user) {
          usersInfo.push({
              user: user._id,
              isRead: false
          });
      }
  });

  if (usersInfo.length === 0) {
    return 
  }

  const notifications = await Notification.create({
      usersInfo: usersInfo,
      message: {
          title,
          body,
          image
      }
  });

 } catch(e) {
  console.log(e)
 }
 
  
});



// const sendIntNotificationToChannelUsers = asyncHandler(async ( title, body, image, channelId) => {
//  try {
//  let subscriptions = await Subscription.find({ channel : channelId, isActive: true, status: 'active' }).populate('user')

//   if(!subscriptions || subscriptions.length === 0) {
//     return res.status(400).send({ message: 'Subscription not found' })
//   }


//   let users = subscriptions.map((subscription) => subscription.user)
//   users = users.filter((user) => user && user.pushToken)
//   const tokens = users.map((user) => user.pushToken);
  
//   const message = {
//       notification: {
//           title,
//           body
//       },
//       data: {
//           title,
//           body,
//           image
//       },
//       android: {
//           notification: {
//               imageUrl: image,
//           },
//       },
//       apns: {
//           payload: {
//               aps: {
//                   'mutable-content': 1
//               }
//           },
//           fcm_options: {
//               image: image
//           }
//       },
//       webpush: {
//           headers: {
//               image
//           }
//       },
//       tokens
//   };

//   const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
//   const usersInfo = [];
  
//   response.responses.forEach((resp, index) => {
//       const user = users[index];

//       if (resp.success && user) {
//           usersInfo.push({
//               user: user._id,
//               isRead: false
//           });
//       }
//   });

//   if (usersInfo.length === 0) {
//     return res.status(400).send({ message: 'Not able to notify users. Please check pushToken' });
//   }

//   const notifications = await Notification.create({
//       usersInfo: usersInfo,
//       message: {
//           title,
//           body,
//           image
//       }
//   });

//  } catch(e) {
//   console.log(e)
//  }
 
  
// });

const sendGroupedNotifications = asyncHandler(async (users, title, body, image) => {

  users = users.filter((user) => user && user.pushToken)
  const tokens = users.map((user) => user.pushToken);
  
  const message = {
    notification: {
      title,
      body,
    },
    data: {
      title,
      body,
      ...(image && { image }),
    },
    ...(image && {
      android: {
        notification: {
          imageUrl: image,
        },
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
          },
        },
        fcm_options: {
          image,
        },
      },
      webpush: {
        headers: {
          image,
        },
      },
    }),
    tokens,
  };


  const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
  const usersInfo = [];
  
  response.responses.forEach((resp, index) => {
      const user = users[index];

      if (resp.success && user) {
          usersInfo.push({
              user: user._id,
              userType: user.type,
              isRead: false
          });
      }
  });

  if (usersInfo.length === 0) {
    return false
  }

  await Notification.create({
      usersInfo: usersInfo,
      message: {
          title,
          body,
          ...(image && { image }), 
      }
  });

  return true
})

module.exports = {
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
    sendOrderNotification,
    sendBookingNotification,
    searchNotifications,
    sendNotificationToGroupUsers,
    sendNotificationToCampaignUsers,
    sendNotificationToSubscribedUsers,
    sendIntNotificationToChannelUsers,
    getNotificationByUserId,
    sendGroupedNotifications
};
