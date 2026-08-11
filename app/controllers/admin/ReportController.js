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

class ReportController {
  async viewReports(req, res) {
    try {
      const adminNotifications = await AdminNotification.find({
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      const revenueData = await Payment.aggregate([
        {
          $match: {
            status: { $in: ["captured", "refunded"] },
            createdAt: { $exists: true },
          },
        },

        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },

            // Total amount originally captured
            capturedAmount: {
              $sum: "$amount",
            },

            // Amount refunded
            refundedAmount: {
              $sum: "$refundedAmount",
            },
          },
        },

        {
          $project: {
            _id: 0,

            year: "$_id.year",
            month: "$_id.month",

            // Net revenue
            netRevenue: {
              $subtract: ["$capturedAmount", "$refundedAmount"],
            },
          },
        },

        {
          $sort: {
            year: 1,
            month: 1,
          },
        },
      ]);

      // -----------------------------------------
      // Last 6 months
      // -----------------------------------------

      const months = [];

      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

        months.push({
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          label: date.toLocaleString("en-IN", {
            month: "short",
          }),
          revenue: 0,
        });
      }

      // -----------------------------------------
      // Match aggregation data
      // -----------------------------------------

      revenueData.forEach((item) => {
        const month = months.find(
          (m) => m.year === item.year && m.month === item.month,
        );

        if (month) {
          month.revenue = item.netRevenue || 0;
        }
      });

      // -----------------------------------------
      // Data for Chart.js
      // -----------------------------------------

      const revenueChart = months.map((item) => ({
        label: item.label,
        revenue: item.revenue,
      }));

      const passengerRouteData = await Passenger.aggregate([
        // -----------------------------------------
        // 1. Ignore deleted passengers
        // -----------------------------------------
        {
          $match: {
            isDeleted: false,
          },
        },

        // -----------------------------------------
        // 2. Passenger -> Booking
        // -----------------------------------------
        {
          $lookup: {
            from: "bookings",
            localField: "bookingId",
            foreignField: "_id",
            as: "booking",
          },
        },

        {
          $unwind: "$booking",
        },

        // -----------------------------------------
        // 3. Only valid bookings
        // -----------------------------------------
        {
          $match: {
            "booking.bookingStatus": {
              $in: ["confirmed", "completed"],
            },

            "booking.isDeleted": false,
          },
        },

        // -----------------------------------------
        // 4. Booking -> Trip
        // -----------------------------------------
        {
          $lookup: {
            from: "trips",
            localField: "booking.tripId",
            foreignField: "_id",
            as: "trip",
          },
        },

        {
          $unwind: "$trip",
        },

        // -----------------------------------------
        // 5. Trip -> Route
        // -----------------------------------------
        {
          $lookup: {
            from: "routes",
            localField: "trip.routeId",
            foreignField: "_id",
            as: "route",
          },
        },

        {
          $unwind: "$route",
        },

        // -----------------------------------------
        // 6. Route -> Origin Stop
        // -----------------------------------------
        {
          $lookup: {
            from: "stops",
            localField: "route.originStopId",
            foreignField: "_id",
            as: "originStop",
          },
        },

        {
          $unwind: "$originStop",
        },

        // -----------------------------------------
        // 7. Route -> Destination Stop
        // -----------------------------------------
        {
          $lookup: {
            from: "stops",
            localField: "route.destinationStopId",
            foreignField: "_id",
            as: "destinationStop",
          },
        },

        {
          $unwind: "$destinationStop",
        },

        // -----------------------------------------
        // 8. Group passengers by route
        // -----------------------------------------
        {
          $group: {
            _id: "$route._id",

            origin: {
              $first: "$originStop.city",
            },

            destination: {
              $first: "$destinationStop.city",
            },

            passengers: {
              $sum: 1,
            },

            bookings: {
              $addToSet: "$booking._id",
            },
          },
        },

        // -----------------------------------------
        // 9. Convert booking IDs into count
        // -----------------------------------------
        {
          $project: {
            _id: 0,

            route: {
              $concat: ["$origin", "–", "$destination"],
            },

            passengers: 1,

            bookingCount: {
              $size: "$bookings",
            },
          },
        },

        // -----------------------------------------
        // 10. Highest passenger routes first
        // -----------------------------------------
        {
          $sort: {
            passengers: -1,
          },
        },

        // -----------------------------------------
        // 11. Top 5 routes
        // -----------------------------------------
        {
          $limit: 5,
        },
      ]);
      return res.render("admin/dashboard/reports", {
        findAdmin: req.user.name,
        adminNotifications,
        revenueChart,
        passengerRouteData,
      });
    } catch (error) {
      logger.error(`Reports page error: ${error.message}`);

      return res.status(500).render("error", {
        message: "Unable to load reports",
      });
    }
  }
}
module.exports = new ReportController();
