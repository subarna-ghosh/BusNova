const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    // Link to your app's entities
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Razorpay Identifiers
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String, // Populated ONLY after verification
      sparse: true, // Allows null/missing values until filled
    },
    razorpaySignature: {
      type: String, // Populated ONLY after verification
    },

    // Amount & Currency
    amount: {
      type: Number, // Stored in INR rupees (e.g., 500) or paisa (e.g., 50000)
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },

    // Payment Details (Captured after verification)
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "netbanking", "wallet", "emi", "unknown"],
      default: "unknown",
    },

    // Payment Status Lifecycle
    status: {
      type: String,
      enum: ["created", "captured", "failed", "refunded"],
      default: "created",
    },
    
    refundId: {
      type: String,
      default: null,
    },

    refundedAmount: {
      type: Number,
      default: 0,
    },

    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
    timestamps: true, // Auto-generates createdAt and updatedAt
  },
);

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
