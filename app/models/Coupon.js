const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    minAmount: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTill: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "expired", "disabled"],
      default: "active",
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

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
