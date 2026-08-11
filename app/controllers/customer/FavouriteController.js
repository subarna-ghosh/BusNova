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
const {
  createAccessToken,
  createRefreshToken,
} = require("../../utils/createToken");
const activityLogger = require("../../helpers/activityLogger");

class FavouriteController {
  async viewFavouriteRoutes(req, res) {
    try {
      const userId = new mongoose.Types.ObjectId(req.user.id);

      const favouriteRoutes = await Booking.aggregate([
        // -----------------------------------------
        // 1. Customer's bookings
        // -----------------------------------------
        {
          $match: {
            userId,
            bookingStatus: {
              $in: ["confirmed", "completed"],
            },
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
          $unwind: "$trip",
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
          $unwind: "$route",
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
          $unwind: "$originStop",
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
          $unwind: "$destinationStop",
        },

        // -----------------------------------------
        // 6. Group same routes
        // -----------------------------------------
        {
          $group: {
            _id: "$route._id",

            origin: {
              $first: "$originStop",
            },

            destination: {
              $first: "$destinationStop",
            },

            bookingCount: {
              $sum: 1,
            },

            lowestFare: {
              $min: "$trip.baseFare",
            },
          },
        },

        // -----------------------------------------
        // 7. Most frequently booked first
        // -----------------------------------------
        {
          $sort: {
            bookingCount: -1,
          },
        },

        // -----------------------------------------
        // 8. Limit results
        // -----------------------------------------
        {
          $limit: 10,
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
      return res.render("customer/favourite_routes", {
        username: req.user.name,
        favouriteRoutes,
        notifications,
      });
    } catch (error) {
      logger.error(`Favourite routes error: ${error.message}`);

      return res.redirect("/web/customer/view/upcoming/trip");
    }
  }
}
module.exports = new FavouriteController();
