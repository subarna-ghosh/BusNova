const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const staffProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    department: {
      type: String,
      enum: ["operations", "support", "finance", "maintenance"],
      required: true,
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

const StaffProfileModel = mongoose.model("StaffProfile", staffProfileSchema);
module.exports = StaffProfileModel;
