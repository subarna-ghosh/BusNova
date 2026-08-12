const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Trip = require("../../models/Trip");
const DriverProfile = require("../../models/DriverProfile");
const Passenger = require("../../models/Passenger");
const sendEmail = require("../../utils/sendEmail");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class TripScheduleController {
  async viewSchedules(req, res) {
    try {
      // -----------------------------------------
      // 1. Logged-in user
      // -----------------------------------------

      const userId = req.user.id;

      if (!userId) {
        logger.warn("User ID not found in JWT");

        return res.redirect("/web/auth/view/login");
      }

      // -----------------------------------------
      // 2. Find driver's profile
      // -----------------------------------------

      const findDriver = await DriverProfile.findOne({
        userId,
        isDeleted: false,
      }).lean();

      if (!findDriver) {
        logger.warn(`Driver profile not found for user: ${userId}`);

        return res.redirect("/web/auth/view/login");
      }

      const driverId = findDriver._id;

      // -----------------------------------------
      // 3. Get driver's upcoming trips
      // -----------------------------------------

      const schedules = await Trip.aggregate([
        // =========================================
        // TRIP
        // =========================================

        {
          $match: {
            driverId: new mongoose.Types.ObjectId(driverId),

            isDeleted: false,

            departureAt: {
              $gte: new Date(),
            },

            status: {
              $ne: "cancelled",
            },
          },
        },

        // =========================================
        // ROUTE
        // =========================================

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

        // =========================================
        // ORIGIN STOP
        // =========================================

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

        // =========================================
        // DESTINATION STOP
        // =========================================

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

        // =========================================
        // BUS
        // =========================================

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

        // =========================================
        // PROJECT
        // =========================================

        {
          $project: {
            _id: 1,

            departureAt: 1,

            arrivalAt: 1,

            status: 1,

            "bus.busNumber": 1,

            // Origin
            "originStop.name": 1,
            "originStop.city": 1,

            // Destination
            "destinationStop.name": 1,
            "destinationStop.city": 1,
          },
        },

        // =========================================
        // SORT
        // =========================================

        {
          $sort: {
            departureAt: 1,
          },
        },
      ]);

      // -----------------------------------------
      // 4. Group trips by departure date
      // -----------------------------------------

      const groupedSchedules = {};

      schedules.forEach((trip) => {
        const dateKey = new Date(trip.departureAt).toISOString().split("T")[0];

        if (!groupedSchedules[dateKey]) {
          groupedSchedules[dateKey] = [];
        }

        groupedSchedules[dateKey].push(trip);
      });

      // -----------------------------------------
      // 5. Render
      // -----------------------------------------

      return res.render("driver/trip_schedule", {
        schedules,
        groupedSchedules,
        findDriver: req.user.name,
      });
    } catch (error) {
      logger.error(`View driver schedule error: ${error.message}`);

      return res.render("driver/trip_schedule", {
        schedules: [],
        groupedSchedules: {},
        findDriver: req.user.name,
      });
    }
  }
}
module.exports = new TripScheduleController();
