const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const emailVerificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", // <-- User model
      required: true,
    },

    otp: {
      type: String,
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      expires: "15m",
    },
  },
  {
    versionKey: false,
  },
);

const EmailVerification = mongoose.model(
  "EmailVerification",
  emailVerificationSchema,
);

module.exports = EmailVerification;
