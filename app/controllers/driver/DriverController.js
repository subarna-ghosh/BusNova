const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const DriverProfile = require("../../models/DriverProfile");
const Booking = require("../../models/Booking");
const Trip = require("../../models/Trip");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Payment = require("../../models/Payment");
const Passenger = require("../../models/Passenger");
const Notification = require("../../models/Notification");
const sendEmail = require("../../utils/sendEmail");
const logger = require("../../utils/logger");
const {
  createAccessToken,
  createRefreshToken,
} = require("../../utils/createToken");
const activityLogger = require("../../helpers/activityLogger");

class DriverController {
  async viewDriverDashboard(req, res) {
    try {
      const driverUserId = req.user.id;
      if (!driverUserId) {
        logger.warn("Driver user ID missing from JWT/session");

        return res.redirect("/web/auth/view/login");
      }

      const driverProfile = await DriverProfile.findOne({
        userId: driverUserId,
        isDeleted: false,
      }).lean();

      if (!driverProfile) {
        logger.warn(`Driver profile not found for user: ${driverUserId}`);

        return res.redirect("/web/auth/view/login");
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const todayTrips = await Trip.aggregate([
        {
          $match: {
            driverId: new mongoose.Types.ObjectId(driverProfile._id),

            departureAt: {
              $gte: startOfToday,
              $lte: endOfToday,
            },

            isDeleted: false,
          },
        },
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
            from: "bookings",

            let: {
              tripId: "$_id",
            },

            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$tripId", "$$tripId"],
                  },

                  bookingStatus: {
                    $in: ["confirmed", "completed"],
                  },
                },
              },
            ],

            as: "bookings",
          },
        },

        {
          $addFields: {
            passengerCount: {
              $sum: {
                $map: {
                  input: "$bookings",

                  as: "booking",

                  in: {
                    $size: {
                      $ifNull: ["$$booking.seatNumbers", []],
                    },
                  },
                },
              },
            },
          },
        },

        {
          $addFields: {
            totalSeats: {
              $add: [
                "$availableSeats",

                {
                  $size: {
                    $ifNull: ["$bookedSeatNumbers", []],
                  },
                },
              ],
            },
          },
        },

        {
          $sort: {
            departureAt: 1,
          },
        },

        {
          $project: {
            _id: 1,

            departureAt: 1,
            arrivalAt: 1,
            status: 1,

            availableSeats: 1,
            bookedSeatNumbers: 1,
            totalSeats: 1,

            passengerCount: 1,

            "route._id": 1,
            "route.origin": 1,
            "route.destination": 1,
            "route.originStop": 1,
            "route.destinationStop": 1,

            "bus._id": 1,
            "bus.busNumber": 1,
          },
        },
      ]);

      let todayPassengerCount = 0;

      todayTrips.forEach((trip) => {
        todayPassengerCount += trip.passengerCount || 0;
      });

      const now = new Date();

      const nextDeparture = await Trip.aggregate([
        {
          $match: {
            driverId: new mongoose.Types.ObjectId(driverProfile._id),
            departureAt: {
              $gte: now,
            },
            isDeleted: false,
            status: {
              $nin: ["cancelled", "completed"],
            },
          },
        },

        {
          $sort: {
            departureAt: 1,
          },
        },

        {
          $limit: 1,
        },

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
          $project: {
            _id: 1,

            departureAt: 1,
            arrivalAt: 1,
            status: 1,

            "route.origin": 1,
            "route.destination": 1,

            "route.originStop": 1,
            "route.destinationStop": 1,

            "bus.busNumber": 1,
          },
        },
      ]);

      // -----------------------------------------
      // On-time rate
      // -----------------------------------------
      // Trip model doesn't have
      // actualDepartureAt, so a real rate cannot
      // be calculated yet.
      // -----------------------------------------

      const onTimeRate = 100;

      const driver = await User.findById(driverUserId)
        .select("name email phone")
        .lean();

      if (!driver) {
        logger.warn(`Driver user not found: ${driverUserId}`);
        return res.redirect("/web/auth/view/login");
      }

      // save notification
      const notifications = await Notification.find({
        isDeleted: false,
        status: "sent",
        $or: [
          { audience: "all" },
          { audience: "Driver" },
          { audience: "specific_user", userId: driverUserId },
        ],
      })
        .sort({ sentAt: -1 })
        .limit(10)
        .lean();

      return res.render("driver/driver_dashboard", {
        driverName: req.user?.name || "Driver",
        currentUserId: driverUserId,
        todayTrips,
        todayPassengerCount,
        onTimeRate,
        nextDeparture: nextDeparture.length > 0 ? nextDeparture[0] : null,
        notifications,
      });
    } catch (error) {
      logger.error(`Driver dashboard error: ${error.message}`);

      return res.render("driver/driver_dashboard", {
        driverName: req.user?.name || "Driver",
        currentUserId: driverUserId,
        todayTrips: [],
        todayPassengerCount: 0,
        onTimeRate: 0,
        nextDeparture: null,
        notifications,
      });
    }
  }
}
module.exports = new DriverController();
