const mongoose = require("mongoose");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Trip = require("../../models/Trip");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Payment = require("../../models/Payment");
const Passenger = require("../../models/Passenger");
const Coupon = require("../../models/Coupon");
const AdminNotification = require("../../models/AdminNotification");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class PaymentController {
  async viewPaymentList(req, res) {
    try {
      const adminNotifications = await AdminNotification.find({
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      const listPayment = await Payment.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "customer",
          },
        },
        {
          $unwind: {
            path: "$customer",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "bookings",
            localField: "bookingId",
            foreignField: "_id",
            as: "booking",
          },
        },

        {
          $unwind: {
            path: "$booking",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            razorpayPaymentId: 1,
            razorpayOrderId: 1,
            paymentMethod: 1,
            amount: 1,
            currency: 1,
            status: 1,
            createdAt: 1,
            bookingId: 1,
            "booking.bookingCode": 1,
            "booking.bookingStatus": 1,
            "customer._id": 1,
            "customer.name": 1,
            "customer.email": 1,
            "customer.phone": 1,
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      );

      const monthlyPayments = await Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startOfMonth,
              $lt: startOfNextMonth,
            },
          },
        },

        {
          $group: {
            _id: "$status",

            totalAmount: {
              $sum: "$amount",
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]);

      let collectedThisMonth = 0;
      let refundsIssued = 0;
      let pendingPayments = 0;

      monthlyPayments.forEach((item) => {
        if (item._id === "captured") {
          collectedThisMonth = item.totalAmount;
        }

        if (item._id === "refunded") {
          refundsIssued = item.totalAmount;
        }

        if (item._id === "created") {
          pendingPayments = item.totalAmount;
        }
      });

      return res.render("admin/dashboard/payments", {
        findAdmin: req.user.name,
        adminNotifications,
        listPayment,
        paymentStats: {
          collectedThisMonth,
          refundsIssued,
          pendingPayments,
        },
      });
    } catch (error) {
      logger.error(`View payment transactions error: ${error.message}`);

      return res.redirect("/web/admin/view/dashboard");
    }
  }
}
module.exports = new PaymentController();
