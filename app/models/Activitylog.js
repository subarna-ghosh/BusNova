const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const activityLogSchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      enum: [
        "Bus",
        "SeatLayout",
        "Route",
        "Stop",
        "Trip",
        "Booking",
        "Payment",
        "Coupon",
        "Driver",
        "Staff",
        "Notification",
        "Banner",
        "Setting",
        "Auth",
      ],
      required: true,
    },
    description: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

const ActivityLogModel = mongoose.model("ActivityLog", activityLogSchema);
module.exports = ActivityLogModel;
