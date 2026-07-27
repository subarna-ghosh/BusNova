const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    phone: {
      type: String,
    },
    profileImage: {
      type: String,
      default: null,
    },
    profileImagePublicId: {
      type: String,
      default: null,
    },
    refreshToken: { type: String },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    isVerified: {
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

const UserModel = mongoose.model("User", userSchema);
module.exports = UserModel;
