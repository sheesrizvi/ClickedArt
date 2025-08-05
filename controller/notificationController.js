const admin = require("../middleware/firebase");
const Notification = require("../models/notificationModel");
const Photographer = require("../models/photographerModel");
const PushToken = require("../models/pushTokenModel");
const User = require("../models/userModel");
const { getMessaging } = require("firebase-admin/messaging");

const saveNotification = async ({
  userDocs,
  title,
  body,
  data = {},
  type = "system",
  image,
  actorInfo = null,
  entityInfo = null,
}) => {
  const usersInfo = userDocs.map((doc) => ({
    user: doc._id,
    userType:
      doc.__t ||
      (doc.constructor.modelName === "Photographer" ? "Photographer" : "User"),
    isRead: false,
  }));

  // Save all extra notification data to DB as well for frontend use (eg. url, order id)
  const notif = new Notification({
    usersInfo,
    message: { title, body, image, data },
    type,
    ...(actorInfo ? { actorInfo } : {}),
    ...(entityInfo ? { entityInfo } : {}),
  });

  await notif.save();
};

// Utility: ensure all data values are strings for FCM data-only messages
function buildSafeData(data = {}, title, body) {
  const safeData = {};
  if (title) safeData.title = String(title);
  if (body) safeData.body = String(body);
  if (data && typeof data === "object") {
    Object.keys(data).forEach((key) => {
      const value = data[key];
      safeData[key] = typeof value === "string" ? value : String(value);
    });
  }
  return safeData;
}

// Send to a single token
exports.sendNotification = async (req, res) => {
  const { token, title, body, data } = req.body;
  const safeData = buildSafeData(data, title, body);

  const message = {
    token,
    android: {
      priority: "high",
    },
    data: safeData
  };

  try {
    const response = await admin.messaging().send(message);
    // Save to DB if needed
    await saveNotification({
      userDocs: [],
      title,
      body,
      data: safeData
    });
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.sendNotificationToSelected = async (req, res) => {
  const {
    userIds,
    title,
    body,
    data,
    type = "system",
    actorInfo,
    entityInfo,
    image,
  } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, error: "userIds required" });
  }

  const safeData = buildSafeData(data, title, body);

  try {
    const userDocs = await User.find({
      _id: { $in: userIds },
      pushToken: { $ne: null },
    });
    const photographerDocs = await Photographer.find({
      _id: { $in: userIds },
      pushToken: { $ne: null },
    });

    const allDocs = [...userDocs, ...photographerDocs];
    const allTokens = allDocs.map((u) => u.pushToken);

    if (allTokens.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No push tokens found for selected users",
      });
    }

    const messages = allTokens.map((token) => ({
      token,
      android: {
        priority: "high",
      },
      data: safeData,
    }));

    const messaging = getMessaging();
    const response = await messaging.sendEach(messages);

    // Save notification to DB for fetched users
    await saveNotification({
      userDocs: allDocs,
      title,
      body,
      data: safeData,
      type,
      actorInfo,
      entityInfo,
      image,
    });

    res.json({ success: true, count: response.responses.length, response });
  } catch (err) {
    console.error("[sendNotificationToSelected]", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to send selected notifications" });
  }
};

exports.sendNotificationToAll = async (req, res) => {
  const {
    title,
    body,
    data,
    type = "system",
    actorInfo,
    entityInfo,
    image,
  } = req.body;

  const safeData = buildSafeData(data, title, body);

  try {
    const userDocs = await User.find({ pushToken: { $ne: null } });
    const photographerDocs = await Photographer.find({
      pushToken: { $ne: null },
    });
    const anonTokens = await PushToken.find({}, "token");

    const allTokens = [
      ...userDocs.map((u) => u.pushToken),
      ...photographerDocs.map((p) => p.pushToken),
      ...anonTokens.map((a) => a.token),
    ];

    const uniqueTokens = [...new Set(allTokens)];

    const messaging = admin.messaging();
    const messages = uniqueTokens.map((token) => ({
      token,
      android: {
        priority: "high",
      },
      data: safeData,
    }));

    const responses = await Promise.allSettled(
      messages.map((m) => messaging.send(m))
    );

    // Save only registered users' notifications to DB
    await saveNotification({
      userDocs: [...userDocs, ...photographerDocs],
      title,
      body,
      data: safeData,
      type,
      actorInfo,
      entityInfo,
      image,
    });

    res.json({ success: true, sent: responses.length });
  } catch (err) {
    console.error("Broadcast error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to send notifications" });
  }
};

exports.updatePushToken = async (req, res) => {
  const { pushToken } = req.body;
  const userId = req.user.id;

  if (!pushToken) {
    return res.status(400).json({ error: "pushToken is required" });
  }

  try {
    let updatedUser = await User.findByIdAndUpdate(
      userId,
      { pushToken },
      { new: true }
    );

    if (!updatedUser) {
      updatedUser = await Photographer.findByIdAndUpdate(
        userId,
        { pushToken },
        { new: true }
      );
    }

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.json({ success: true, pushToken });
  } catch (err) {
    console.error("[PushToken]", err);
    res.status(500).json({ error: "Failed to update push token" });
  }
};

exports.deletePushToken = async (req, res) => {
  const userId = req.user.id;
  try {
    let updatedUser = await User.findByIdAndUpdate(
      userId,
      { pushToken: null },
      { new: true }
    );
    if (!updatedUser) {
      updatedUser = await Photographer.findByIdAndUpdate(
        userId,
        { pushToken: null },
        { new: true }
      );
    }
    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.json({ success: true, message: "Push token deleted successfully" });
  } catch (err) {
    console.error("[Delete PushToken]", err);
    res.status(500).json({ error: "Failed to delete push token" });
  }
};

exports.saveAnonymousToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token required" });

  try {
    await PushToken.updateOne({ token }, { token }, { upsert: true });
    res.json({ success: true });
  } catch (err) {
    console.error("Save anonymous token error:", err);
    res.status(500).json({ error: "Failed to save token" });
  }
};

exports.getMyNotifications = async (req, res) => {
  const userId = req.user.id || req.query.userId;
  const userType = req.query.userType || req.user.role || "User";
  try {
    const notifications = await Notification.find({
      usersInfo: {
        $elemMatch: {
          user: userId,
          userType,
        },
      },
    })
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("[Fetch Notifications]", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch notifications" });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userType = req.user.role;

  try {
    const result = await Notification.updateOne(
      { _id: id, "usersInfo.user": userId, "usersInfo.userType": userType },
      { $set: { "usersInfo.$.isRead": true } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or already read",
      });
    }

    res.json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("[Mark Read]", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to mark notification as read" });
  }
};

exports.getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .populate("usersInfo.user", "name")
      .populate("actorInfo.actor", "name")
      .populate("entityInfo.entity");

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("[Admin Fetch All]", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch all notifications" });
  }
};

exports.deleteNotification = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Notification.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("[Delete Notification]", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete notification" });
  }
};
