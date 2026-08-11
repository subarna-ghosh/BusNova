const mongoose = require("mongoose");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Bus = require("../../models/Bus");
const Booking = require("../../models/Booking");
const Trip = require("../../models/Trip");
const DriverProfile = require("../../models/DriverProfile");
const AdminNotification = require("../../models/AdminNotification");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Payment = require("../../models/Payment");
const Passenger = require("../../models/Passenger");
const Coupon = require("../../models/Coupon");
const logger = require("../../utils/logger");
const {
  createAccessToken,
  createRefreshToken,
} = require("../../utils/createToken");
const activityLogger = require("../../helpers/activityLogger");
class AdminController {
  async viewAdminDashboard(req, res) {
    try {
      const adminNotifications = await AdminNotification.find({
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      const bookings = await Booking.aggregate([
        {
          $match: {
            isDeleted: false,
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },

        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "trips",
            localField: "tripId",
            foreignField: "_id",
            as: "trip",
          },
        },

        {
          $unwind: {
            path: "$trip",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "routes",
            localField: "trip.routeId",
            foreignField: "_id",
            as: "route",
          },
        },

        {
          $unwind: {
            path: "$route",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "stops",
            localField: "route.originStopId",
            foreignField: "_id",
            as: "originStop",
          },
        },

        {
          $unwind: {
            path: "$originStop",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "stops",
            localField: "route.destinationStopId",
            foreignField: "_id",
            as: "destinationStop",
          },
        },

        {
          $unwind: {
            path: "$destinationStop",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $project: {
            bookingCode: 1,
            seatNumbers: 1,
            baseAmount: 1,
            discountAmount: 1,
            totalAmount: 1,
            bookingStatus: 1,
            createdAt: 1,

            "user.name": 1,
            "user.email": 1,
            "user.phone": 1,

            "trip.departureAt": 1,
            "trip.arrivalAt": 1,

            "originStop.name": 1,
            "originStop.city": 1,

            "destinationStop.name": 1,
            "destinationStop.city": 1,
          },
        },
        { $limit: 4 },
      ]);
      const viewTrips = await Trip.aggregate([
        {
          $lookup: {
            from: "routes",
            localField: "routeId",
            foreignField: "_id",
            as: "route",
          },
        },

        {
          $unwind: {
            path: "$route",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "stops",
            localField: "route.originStopId",
            foreignField: "_id",
            as: "originStop",
          },
        },

        {
          $unwind: {
            path: "$originStop",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "stops",
            localField: "route.destinationStopId",
            foreignField: "_id",
            as: "destinationStop",
          },
        },

        {
          $unwind: {
            path: "$destinationStop",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "buses",
            localField: "busId",
            foreignField: "_id",
            as: "bus",
          },
        },
        {
          $unwind: {
            path: "$bus",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "driverprofiles",
            localField: "driverId",
            foreignField: "_id",
            as: "dprofile",
          },
        },
        {
          $unwind: {
            path: "$dprofile",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "dprofile.userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            isDeleted: false,
            departureAt: {
              $gte: new Date(),
            },
            status: {
              $in: ["scheduled", "boarding", "delayed"],
            },
          },
        },
        {
          $sort: {
            departureAt: 1,
          },
        },
        {
          $limit: 3,
        },
      ]);

      // booking and revenue chart
      const today = new Date();

      // -----------------------------------------
      // LAST 7 DAYS
      // -----------------------------------------

      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);

      // -----------------------------------------
      // PAYMENT REPORT
      // -----------------------------------------

      const revenueChart = await Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },

            status: {
              $in: ["captured", "refunded"],
            },
          },
        },

        // -----------------------------------------
        // GROUP BY DATE
        // -----------------------------------------

        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },

            // Successful bookings
            bookings: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$status", "captured"],
                  },
                  1,
                  0,
                ],
              },
            },

            // Captured amount
            capturedAmount: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$status", "captured"],
                  },
                  "$amount",
                  0,
                ],
              },
            },

            // Refunded amount
            refundedAmount: {
              $sum: "$refundedAmount",
            },
          },
        },

        // -----------------------------------------
        // NET REVENUE
        // -----------------------------------------

        {
          $project: {
            _id: 1,

            bookings: 1,

            capturedAmount: 1,

            refundedAmount: 1,

            netRevenue: {
              $subtract: ["$capturedAmount", "$refundedAmount"],
            },
          },
        },

        // -----------------------------------------
        // SORT
        // -----------------------------------------

        {
          $sort: {
            _id: 1,
          },
        },
      ]);

      const occupancyChart = await Trip.aggregate([
        // -----------------------------------------
        // Only active/upcoming trips
        // -----------------------------------------

        {
          $match: {
            isDeleted: false,

            status: {
              $in: ["scheduled", "boarding", "delayed"],
            },
          },
        },

        // -----------------------------------------
        // Route
        // -----------------------------------------

        {
          $lookup: {
            from: "routes",
            localField: "routeId",
            foreignField: "_id",
            as: "route",
          },
        },

        {
          $unwind: {
            path: "$route",
            preserveNullAndEmptyArrays: false,
          },
        },

        // -----------------------------------------
        // Origin stop
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
          $unwind: {
            path: "$originStop",
            preserveNullAndEmptyArrays: true,
          },
        },

        // -----------------------------------------
        // Destination stop
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
          $unwind: {
            path: "$destinationStop",
            preserveNullAndEmptyArrays: true,
          },
        },

        // -----------------------------------------
        // Calculate booked seats
        // -----------------------------------------

        {
          $addFields: {
            bookedCount: {
              $size: {
                $ifNull: ["$bookedSeatNumbers", []],
              },
            },
          },
        },

        // -----------------------------------------
        // Calculate total capacity
        // -----------------------------------------

        {
          $addFields: {
            totalSeats: {
              $add: ["$bookedCount", "$availableSeats"],
            },
          },
        },

        // -----------------------------------------
        // Group by route
        // -----------------------------------------

        {
          $group: {
            _id: "$routeId",

            origin: {
              $first: "$originStop.city",
            },

            destination: {
              $first: "$destinationStop.city",
            },

            bookedSeats: {
              $sum: "$bookedCount",
            },

            availableSeats: {
              $sum: "$availableSeats",
            },

            totalSeats: {
              $sum: "$totalSeats",
            },
          },
        },

        // -----------------------------------------
        // Calculate occupancy percentage
        // -----------------------------------------

        {
          $addFields: {
            occupancy: {
              $cond: [
                {
                  $gt: ["$totalSeats", 0],
                },
                {
                  $multiply: [
                    {
                      $divide: ["$bookedSeats", "$totalSeats"],
                    },
                    100,
                  ],
                },

                0,
              ],
            },
          },
        },

        // -----------------------------------------
        // Sort highest occupancy first
        // -----------------------------------------

        {
          $sort: {
            occupancy: -1,
          },
        },

        // -----------------------------------------
        // Limit chart to top 5 routes
        // -----------------------------------------

        {
          $limit: 5,
        },

        // -----------------------------------------
        // Final data
        // -----------------------------------------

        {
          $project: {
            _id: 0,
            route: {
              $concat: [
                {
                  $ifNull: ["$origin", "Unknown"],
                },

                " → ",
                {
                  $ifNull: ["$destination", "Unknown"],
                },
              ],
            },
            occupancy: {
              $round: ["$occupancy", 1],
            },
            bookedSeats: 1,
            availableSeats: 1,
            totalSeats: 1,
          },
        },
      ]);

      // =========================================
      // DASHBOARD STATISTICS
      // =========================================

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // -----------------------------------------
      // 1. ACTIVE BUSES
      // -----------------------------------------

      const activeBuses = await Bus.countDocuments({
        isDeleted: false,
      });

      // -----------------------------------------
      // 2. LIVE ROUTES
      // -----------------------------------------

      const liveRoutes = await Route.countDocuments({
        isDeleted: false,
      });

      // -----------------------------------------
      // 3. BOOKINGS TODAY
      // -----------------------------------------

      const bookingStats = await Booking.aggregate([
        {
          $match: {
            isDeleted: false,
            bookingStatus: "confirmed",
            createdAt: {
              $gte: todayStart,
              $lte: todayEnd,
            },
          },
        },
        {
          $count: "total",
        },
      ]);

      const bookingsToday = bookingStats[0]?.total || 0;

      // -----------------------------------------
      // 4. REVENUE TODAY
      // Captured amount - refunded amount
      // -----------------------------------------

      const revenueStats = await Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: todayStart,
              $lte: todayEnd,
            },
            status: {
              $in: ["captured", "refunded"],
            },
          },
        },
        {
          $group: {
            _id: null,

            capturedAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", "captured"] }, "$amount", 0],
              },
            },

            refundedAmount: {
              $sum: "$refundedAmount",
            },
          },
        },
        {
          $project: {
            _id: 0,

            netRevenue: {
              $subtract: ["$capturedAmount", "$refundedAmount"],
            },
          },
        },
      ]);

      const revenueToday = revenueStats[0]?.netRevenue || 0;

      return res.render("admin/dashboard/admin_dashboard", {
        adminNotifications,
        findAdmin: req.user.name,
        findBooking: bookings,
        viewTrips,
        revenueChart,
        occupancyChart,
        // Dashboard statistics
        activeBuses,
        liveRoutes,
        bookingsToday,
        revenueToday,
      });
    } catch (error) {
      logger.error(`Admin Dashboard Error: ${error.message}`);
      return res.redirect("/web/auth/view/login");
    }
  }
}
module.exports = new AdminController();
