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
      // -----------------------------------------
      // 1. Get logged-in driver
      // -----------------------------------------

      const driverUserId = req.user.id;

      if (!driverUserId) {
        logger.warn("Driver user ID missing from JWT/session");

        return res.redirect("/web/auth/view/login");
      }

      // -----------------------------------------
      // 2. Find DriverProfile
      // -----------------------------------------

      const driverProfile = await DriverProfile.findOne({
        userId: driverUserId,
        isDeleted: false,
      }).lean();

      if (!driverProfile) {
        logger.warn(`Driver profile not found for user: ${driverUserId}`);

        return res.redirect("/web/auth/view/login");
      }

      // -----------------------------------------
      // 3. Today start/end
      // -----------------------------------------

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // -----------------------------------------
      // 4. Get today's trips
      // -----------------------------------------

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
            preserveNullAndEmptyArrays: true,
          },
        },

        // -----------------------------------------
        // Origin Stop
        // route.originStopId -> stops._id
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
        // Destination Stop
        // route.destinationStopId -> stops._id
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
        // Bus
        // -----------------------------------------

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

        // -----------------------------------------
        // Bookings
        // -----------------------------------------

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

                  isDeleted: false,
                },
              },
            ],

            as: "bookings",
          },
        },

        // -----------------------------------------
        // Passenger count
        // -----------------------------------------

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

        // -----------------------------------------
        // Total seats
        // -----------------------------------------

        {
          $addFields: {
            totalSeats: {
              $add: [
                {
                  $ifNull: ["$availableSeats", 0],
                },

                {
                  $size: {
                    $ifNull: ["$bookedSeatNumbers", []],
                  },
                },
              ],
            },
          },
        },

        // -----------------------------------------
        // Sort
        // -----------------------------------------

        {
          $sort: {
            departureAt: 1,
          },
        },

        // -----------------------------------------
        // Project
        // -----------------------------------------

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

            // Origin stop
            "originStop._id": 1,
            "originStop.name": 1,
            "originStop.city": 1,

            // Destination stop
            "destinationStop._id": 1,
            "destinationStop.name": 1,
            "destinationStop.city": 1,

            // Bus
            "bus._id": 1,
            "bus.busNumber": 1,
          },
        },
      ]);

      // -----------------------------------------
      // 5. Total passengers today
      // -----------------------------------------

      let todayPassengerCount = 0;

      todayTrips.forEach((trip) => {
        todayPassengerCount += trip.passengerCount || 0;
      });

      // -----------------------------------------
      // 6. Next departure
      // -----------------------------------------

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

        // -----------------------------------------
        // Get nearest trip
        // -----------------------------------------

        {
          $sort: {
            departureAt: 1,
          },
        },

        {
          $limit: 1,
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
            preserveNullAndEmptyArrays: true,
          },
        },

        // -----------------------------------------
        // Origin Stop
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
        // Destination Stop
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
        // Bus
        // -----------------------------------------

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

        // -----------------------------------------
        // Project
        // -----------------------------------------

        {
          $project: {
            _id: 1,

            departureAt: 1,
            arrivalAt: 1,
            status: 1,

            // Origin
            "originStop._id": 1,
            "originStop.name": 1,
            "originStop.city": 1,

            // Destination
            "destinationStop._id": 1,
            "destinationStop.name": 1,
            "destinationStop.city": 1,

            // Bus
            "bus.busNumber": 1,
          },
        },
      ]);

      // -----------------------------------------
      // 7. On-time rate
      // -----------------------------------------

      // Trip currently does not have
      // actualDepartureAt / delayedBy.
      //
      // Therefore real historical on-time
      // calculation isn't possible yet.

      const onTimeRate = 100;

      // -----------------------------------------
      // 8. Get driver user
      // -----------------------------------------

      const driver = await User.findById(driverUserId)
        .select("name email phone")
        .lean();

      if (!driver) {
        logger.warn(`Driver user not found: ${driverUserId}`);

        return res.redirect("/web/auth/view/login");
      }

      // -----------------------------------------
      // 9. Get notifications
      // -----------------------------------------

      const notifications = await Notification.find({
        isDeleted: false,
        status: "sent",

        $or: [
          {
            audience: "all",
          },

          {
            audience: "Driver",
          },

          {
            audience: "specific_user",
            userId: driverUserId,
          },
        ],
      })
        .sort({
          sentAt: -1,
        })
        .limit(10)
        .lean();

      // -----------------------------------------
      // 10. Render dashboard
      // -----------------------------------------

      return res.render("driver/driver_dashboard", {
        driverName: driver.name || req.user?.name || "Driver",
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
        currentUserId: req.user?.id || null,
        todayTrips: [],
        todayPassengerCount: 0,
        onTimeRate: 0,
        nextDeparture: null,
        notifications: [],
      });
    }
  }
}
module.exports = new DriverController();
