const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const notificationSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },
    
    audience: {
      type: String,
      enum: ["all", "Customer", "Driver", "Staff", "specific_user"],
      default: "all",
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    sentBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    scheduledAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "scheduled", "sent", "failed"],
      default: "draft",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
