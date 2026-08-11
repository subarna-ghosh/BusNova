const cloudinary = require("../../config/cloudinary");
const fs = require("fs").promises;
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
const sendEmail = require("../../utils/sendEmail");
const logger = require("../../utils/logger");
const {
  createAccessToken,
  createRefreshToken,
} = require("../../utils/createToken");
const activityLogger = require("../../helpers/activityLogger");

class CancelledTripsController {
  async viewCancelledTrips(req, res) {
    try {
      const userId = req.user.id;

      const cancelledTrips = await Booking.aggregate([
        // -----------------------------------------
        // 1. Customer's cancelled bookings
        // -----------------------------------------
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            bookingStatus: "cancelled",
            isDeleted: false,
          },
        },

        // -----------------------------------------
        // 2. Booking → Trip
        // -----------------------------------------
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

        // -----------------------------------------
        // 3. Trip → Route
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
          $unwind: {
            path: "$route",
            preserveNullAndEmptyArrays: true,
          },
        },

        // -----------------------------------------
        // 4. Route → Origin Stop
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
        // 5. Route → Destination Stop
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
        // 6. Booking → Payment
        // -----------------------------------------
        {
          $lookup: {
            from: "payments",
            localField: "_id",
            foreignField: "bookingId",
            as: "payment",
          },
        },

        {
          $unwind: {
            path: "$payment",
            preserveNullAndEmptyArrays: true,
          },
        },

        // -----------------------------------------
        // 7. Latest cancelled booking first
        // -----------------------------------------
        {
          $sort: {
            updatedAt: -1,
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

      return res.render("customer/cancelled_trips", {
        username: req.user.name,
        cancelledTrips,
        notifications,
      });
    } catch (error) {
      logger.error(`Cancelled trips error: ${error.message}`);

      return res.redirect("/web/customer/view/upcoming/trip");
    }
  }
}
module.exports = new CancelledTripsController();
