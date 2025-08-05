const admin = require("./firebase");
const Notification = require("../models/notificationModel");
const Photographer = require("../models/photographerModel");
const User = require("../models/userModel");

const sendNotificationToUser = async ({
  userId,
  userType,
  title,
  body,
  type,
  data = {},
  entity,
  actor,
  actorType,
}) => {
  // 1. Ensure all data values are strings
  const stringifiedData = {};
  Object.keys(data).forEach((key) => {
    stringifiedData[key] = String(data[key]);
  });
  stringifiedData.type = type || "other";

  // Optional: include title and body in data if needed in client-side
  stringifiedData.title = title;
  stringifiedData.body = body;

  // 2. Save in-app notification with data
  await Notification.create({
    usersInfo: [{ user: userId, userType, isRead: false }],
    message: { title, body, data: stringifiedData },
    type,
    entityInfo: entity || {},
    actorInfo: actor
      ? { actor, actorType }
      : { actor: userId, actorType: userType },
  });

  // 3. Get push token
  const Model = userType === "Photographer" ? Photographer : User;
  const recipient = await Model.findById(userId).select("pushToken");
  if (!recipient?.pushToken) return;

  // 4. Send push notification with only data (no visible alert)
  await admin.messaging().send({
    token: recipient.pushToken,
    data: stringifiedData, // no `notification` field
    android: {
      priority: "high",
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
        },
      },
    },
  });
};

module.exports = { sendNotificationToUser };
