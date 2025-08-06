const express = require("express");
const router = express.Router();
const {
  sendNotification,
  updatePushToken,
  deletePushToken,
  sendNotificationToAll,
  sendNotificationToSelected,
  sendNotificationToUserApp,
  sendNotificationToPhotographerApp,
  saveAnonymousToken,
  getMyNotifications,
  markNotificationAsRead,
  getAllNotifications,
  deleteNotification,
} = require("../controller/notificationController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

router.post("/send-notification", sendNotification);
router.post("/send-notification-all", sendNotificationToAll);
router.post("/send-notification-user-app", sendNotificationToUserApp);
router.post(
  "/send-notification-photographer-app",
  sendNotificationToPhotographerApp
);
router.put("/push-token", verifyToken, updatePushToken);
router.put("/delete-push-token", verifyToken, deletePushToken);
router.post("/send-selected", sendNotificationToSelected);
router.post("/save-token", saveAnonymousToken);
router.get("/my", verifyToken, getMyNotifications);
router.put("/read/:id", verifyToken, markNotificationAsRead);
router.get("/all", verifyToken, isAdmin, getAllNotifications);
router.delete("/:id", verifyToken, isAdmin, deleteNotification);

module.exports = router;
