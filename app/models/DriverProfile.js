const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const driverProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
    },
    licenseExpiry: {
      type: Date,
      required: true,
    },
    assignedBusId: {
      type: Schema.Types.ObjectId,
      ref: "Bus",
    },
    dutyStatus: {
      type: String,
      enum: ["on_duty", "off_duty", "suspended"],
      default: "off_duty",
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

const DriverProfileModel = mongoose.model("DriverProfile", driverProfileSchema);
module.exports = DriverProfileModel;
