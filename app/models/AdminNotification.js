const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminNotificationSchema = new Schema(
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

    type: {
      type: String,
      enum: [
        "registration",
        "booking",
        "payment",
        "cancellation",
        "trip",
        "system",
      ],
      default: "system",
    },

    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
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

const AdminNotification = mongoose.model(
  "AdminNotification",
  adminNotificationSchema,
);

module.exports = AdminNotification;
