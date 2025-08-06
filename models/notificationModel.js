const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    usersInfo: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "usersInfo.userType",
          required: true,
        },
        userType: {
          type: String,
          required: true,
          enum: ["User", "Photographer"],
        },
        isRead: { type: Boolean, default: false },
      },
    ],
    message: {
      title: { type: String, required: true },
      body: { type: String, required: true },
      image: { type: String },
      data: {
        type: Map,
        of: String,
        default: {},
      },
    },
    type: {
      type: String,
      required: true,
      enum: [
        "like",
        "comment",
        "follow",
        "mention",
        "system",
        "order",
        "other",
        "image",
        "blog",
        "subscription",
        "invoice",
        "monetization",
      ],
      default: "other",
    },
    entityInfo: {
      entity: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "entityInfo.entityType",
      },
      entityType: {
        type: String,
        enum: ["Post", "Blog", "Comment", "Like"],
      },
    },
    actorInfo: {
      actor: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "actorInfo.actorType",
      },
      actorType: {
        type: String,
        enum: ["User", "Photographer"],
      },
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
