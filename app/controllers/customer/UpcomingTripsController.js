const mongoose = require("mongoose");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Trip = require("../../models/Trip");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Payment = require("../../models/Payment");
const Passenger = require("../../models/Passenger");
const Notification = require("../../models/Notification");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class UpcomingTripsController {
  async viewUpcomingTrips(req, res) {
    try {
      const userId = new mongoose.Types.ObjectId(req.user.id);

      const now = new Date();

      const findBooking = await Booking.aggregate([
        // =========================================
        // 1. CUSTOMER'S BOOKINGS
        // =========================================

        {
          $match: {
            userId: userId,
            bookingStatus: {
              $in: ["confirmed", "pending"],
            },
            isDeleted: false,
          },
        },

        // =========================================
        // 2. BOOKING → TRIP
        // =========================================

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
            preserveNullAndEmptyArrays: false,
          },
        },

        // =========================================
        // 3. ONLY FUTURE TRIPS
        // =========================================

        {
          $match: {
            "trip.departureAt": {
              $gte: now,
            },
          },
        },

        // =========================================
        // 4. TRIP → ROUTE
        // =========================================

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

        // =========================================
        // 5. ROUTE → ORIGIN STOP
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
        // 6. ROUTE → DESTINATION STOP
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
        // 7. TRIP → BUS
        // =========================================

        {
          $lookup: {
            from: "buses",
            localField: "trip.busId",
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
        // 8. PUT BUS INSIDE TRIP
        // =========================================

        {
          $set: {
            "trip.bus": "$bus",
          },
        },

        // =========================================
        // 9. SORT BY DEPARTURE
        // =========================================

        {
          $sort: {
            "trip.departureAt": 1,
          },
        },

        // =========================================
        // 10. REMOVE UNNECESSARY BUS FIELD
        // =========================================

        {
          $project: {
            bus: 0,
          },
        },
      ]);

      const notifications = await Notification.find({
        isDeleted: false,
        status: "sent",
        $or: [
          { audience: "all" },
          { audience: "Customer" },
          { audience: "specific_user", userId: req.user.id },
        ],
      })
        .sort({ sentAt: -1 })
        .limit(10)
        .lean();

      return res.render("customer/upcoming_trips", {
        findBooking,
        username: req.user.name,
        notifications,
      });
    } catch (error) {
      logger.error(`View upcoming trips error: ${error.message}`);

      return res.redirect("/web/customer/view/dashboard");
    }
  }
}
module.exports = new UpcomingTripsController();
