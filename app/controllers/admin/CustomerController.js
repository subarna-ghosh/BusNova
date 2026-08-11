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

class CustomerController {
  async viewCustomers(req, res) {
    try {
      const adminNotifications = await AdminNotification.find({
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      const customerRole = await Role.findOne({
        roleName: "Customer",
      });
      if (!customerRole) {
        logger.warn("Customer role not found");

        return res.render("admin/dashboard/customers", {
          findAdmin: req.user.name,
          customers: [],
          adminNotifications,
        });
      }

      const customers = await User.aggregate([
        {
          $match: {
            roleId: customerRole._id,
            status: "active",
            isDeleted: false,
          },
        },

        // User -> Bookings
        {
          $lookup: {
            from: "bookings",
            localField: "_id",
            foreignField: "userId",
            as: "bookings",
          },
        },

        // Add booking count
        {
          $addFields: {
            bookingCount: {
              $size: "$bookings",
            },
          },
        },

        // Only return required fields
        {
          $project: {
            name: 1,
            email: 1,
            phone: 1,
            bookingCount: 1,
            createdAt: 1,
          },
        },

        // Latest customers first
        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);

      return res.render("admin/dashboard/customers", {
        findAdmin: req.user.name,
        customers,
        adminNotifications,
      });
    } catch (error) {
      logger.error(`View Customers Error: ${error.message}`);

      return res.redirect("/web/admin/view/dashboard");
    }
  }
}
module.exports = new CustomerController();
