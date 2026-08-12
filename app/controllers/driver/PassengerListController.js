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
const activityLogger = require("../../helpers/activityLogger");

class PassengerListController {
  async viewPassengerList(req, res) {
    try {
      const driverUserId = req.user.id;
      if (!driverUserId) {
        logger.warn("Driver user ID missing");
        return res.redirect("/web/auth/view/login");
      }

      const driverProfile = await DriverProfile.findOne({
        userId: driverUserId,
        isDeleted: false,
      }).lean();

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

      if (!driverProfile) {
        logger.warn(`Driver profile not found for user: ${driverUserId}`);

        return res.render("driver/passenger_list", {
          trips: [],
          selectedTrip: null,
          passengers: [],
          driverName: req.user.name || "Driver",
          notifications,
        });
      }

      const trips = await Trip.aggregate([
        {
          $match: {
            driverId: driverProfile._id,
            isDeleted: false,

            status: {
              $nin: ["completed", "cancelled"],
            },
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

            // Route
            origin: "$route.origin",
            destination: "$route.destination",

            // Stops
            originStop: {
              _id: "$originStop._id",
              name: "$originStop.name",
              city: "$originStop.city",
            },

            destinationStop: {
              _id: "$destinationStop._id",
              name: "$destinationStop.name",
              city: "$destinationStop.city",
            },

            // Bus
            busNumber: "$bus.busNumber",
          },
        },
      ]);

      // -----------------------------------------
      // 4. No trips
      // -----------------------------------------

      if (!trips.length) {
        return res.render("driver/passenger_list", {
          trips: [],
          selectedTrip: null,
          passengers: [],
          driverName: req.user.name || "Driver",
          notifications,
        });
      }

      // -----------------------------------------
      // 5. Selected trip
      // -----------------------------------------

      const selectedTripId = req.query.trip || trips[0]._id.toString();

      const selectedTrip = trips.find(
        (trip) => trip._id.toString() === selectedTripId,
      );

      // -----------------------------------------
      // Invalid selected trip
      // -----------------------------------------

      if (!selectedTrip) {
        return res.render("driver/passenger_list", {
          trips,
          selectedTrip: trips[0],
          passengers: [],
          driverName: req.user.name || "Driver",
          notifications
        });
      }

      const passengers = await Booking.aggregate([
        {
          $match: {
            tripId: selectedTrip._id,
            bookingStatus: {
              $in: ["confirmed", "completed"],
            },
            isDeleted: false,
          },
        },

        {
          $lookup: {
            from: "passengers",
            localField: "_id",
            foreignField: "bookingId",
            as: "passengers",
          },
        },

        {
          $unwind: {
            path: "$passengers",
            preserveNullAndEmptyArrays: false,
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
          $project: {
            _id: "$passengers._id",
            seatNumber: "$passengers.seatNumber",
            name: "$passengers.name",
            age: "$passengers.age",
            phone: "$user.phone",
            bookingStatus: "$bookingStatus",
          },
        },

        {
          $sort: {
            seatNumber: 1,
          },
        },
      ]);

      return res.render("driver/passenger_list", {
        trips,
        selectedTrip,
        passengers,
        driverName: req.user.name || "Driver",
        notifications
      });
    } catch (error) {
      logger.error(`View passenger list error: ${error.message}`);

      return res.render("driver/passenger_list", {
        trips: [],
        selectedTrip: null,
        passengers: [],
        driverName: req.user?.name || "Driver",
        notifications
      });
    }
  }
}
module.exports = new PassengerListController();
