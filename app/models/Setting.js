const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const settingSchema = new Schema(
  {
    siteName: {
      type: String,
      default: "BusNova",
    },
    supportEmail: {
      type: String,
      required: true,
    },
    supportPhone: {
      type: String,
      required: true,
    },
    logoUrl: {
      type: String,
    },
    brandColor: {
      type: String,
      default: "#ff9e2c",
    },
    socialLinks: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);

const SettingModel = mongoose.model("Setting", settingSchema);
module.exports = SettingModel;
