const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const SeatLayout = require("../../models/Seat");
const Bus = require("../../models/Bus");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Driver = require("../../models/DriverProfile");
const Trip = require("../../models/Trip");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class TripController {
  async viewTrips(req, res) {
    const showRoutes = await Route.aggregate([
      {
        $lookup: {
          from: "stops",
          localField: "originStopId",
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
          localField: "destinationStopId",
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
    ]);
    const viewBuses = await Bus.find({ isDeleted: false });
    const viewDrivers = await Driver.aggregate([
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
          as: "driver",
        },
      },
      {
        $unwind: {
          path: "$driver",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "driver.userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: {
          path: "$userInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    return res.render("admin/dashboard/trips", {
      routes: showRoutes,
      buses: viewBuses,
      drivers: viewDrivers,
      trips: viewTrips,
    });
  }

  async createTrip(req, res) {
    try {
      const {
        routeId,
        busId,
        driverId,
        departureAt,
        arrivalAt,
        baseFare,
        status,
      } = req.body;

      // Validation
      if (
        !routeId ||
        !busId ||
        !driverId ||
        !departureAt ||
        !arrivalAt ||
        !baseFare
      ) {
        req.session.errors = {
          trip: "All required fields are required.",
        };

        return res.redirect("/web/admin/view/trips");
      }

      const departure = new Date(departureAt);
      const arrival = new Date(arrivalAt);

      if (departure >= arrival) {
        req.session.errors = {
          trip: "Arrival time must be after departure time.",
        };

        return res.redirect("/web/admin/view/trips");
      }

      // Bus
      const bus = await Bus.findOne({
        _id: busId,
        isDeleted: false,
      });

      if (!bus) {
        req.session.errors = {
          trip: "Selected bus not found.",
        };

        return res.redirect("/web/admin/view/trips");
      }

      // Driver
      const driver = await Driver.findOne({
        _id: driverId,
        isDeleted: false,
      });

      if (!driver) {
        req.session.errors = {
          trip: "Selected driver not found.",
        };

        return res.redirect("/web/admin/view/trips");
      }

      // Route
      const route = await Route.findOne({
        _id: routeId,
        isDeleted: false,
      });

      if (!route) {
        req.session.errors = {
          trip: "Selected route not found.",
        };

        return res.redirect("/web/admin/view/trips");
      }

      // Bus Conflict
      const busConflict = await Trip.findOne({
        busId,
        isDeleted: false,
        status: { $ne: "cancelled" },
        departureAt: { $lt: arrival },
        arrivalAt: { $gt: departure },
      });

      if (busConflict) {
        req.session.errors = {
          trip: "Bus is already scheduled during this time.",
        };

        return res.redirect("/web/admin/view/trips");
      }

      // Driver Conflict
      const driverConflict = await Trip.findOne({
        driverId,
        isDeleted: false,
        status: { $ne: "cancelled" },
        departureAt: { $lt: arrival },
        arrivalAt: { $gt: departure },
      });

      if (driverConflict) {
        req.session.errors = {
          trip: "Driver is already assigned during this time.",
        };

        return res.redirect("/web/admin/view/trips");
      }

      const trip = await Trip.create({
        routeId,
        busId,
        driverId,
        departureAt: departure,
        arrivalAt: arrival,
        baseFare: Number(baseFare),
        availableSeats: bus.totalSeats,
        bookedSeatNumbers: [],
        status: status || "scheduled",
      });

      logger.info(`Trip Created : ${trip._id}`);

      await activityLogger(req, {
        userId: req.user.id,
        module: "Trip",
        action: "Create",
        description: `Created Trip for Bus ${bus.busNumber}`,
        documentId: trip._id,
      });

      req.session.success = "Trip scheduled successfully.";

      return res.redirect("/web/admin/view/trips");
    } catch (error) {
      logger.error(`Create Trip Error : ${error.message}`);

      req.session.errors = {
        trip: "Something went wrong.",
      };

      return res.redirect("/web/admin/view/trips");
    }
  }

  async updateTrip(req, res) {
    try {
      const { id } = req.params;
      const {
        routeId,
        busId,
        driverId,
        departureAt,
        arrivalAt,
        baseFare,
        availableSeats,
        status,
      } = req.body;

      // 1. Check if the trip exists
      const existingTrip = await Trip.findOne({ _id: id, isDeleted: false });
      if (!existingTrip) {
        req.session.errors = { trip: "Trip not found or has been deleted." };
        return res.redirect("/web/admin/view/trips");
      }

      // 2. Validate Required Fields
      if (
        !routeId ||
        !busId ||
        !driverId ||
        !departureAt ||
        !arrivalAt ||
        !baseFare
      ) {
        req.session.errors = { trip: "Please fill in all required fields." };
        return res.redirect("/web/admin/view/trips");
      }

      // 3. Validate Date Parameters
      const departureDate = new Date(departureAt);
      const arrivalDate = new Date(arrivalAt);

      if (isNaN(departureDate.getTime()) || isNaN(arrivalDate.getTime())) {
        req.session.errors = {
          trip: "Invalid departure or arrival date format.",
        };
        return res.redirect("/web/admin/view/trips");
      }

      if (departureDate >= arrivalDate) {
        req.session.errors = {
          trip: "Arrival time must be after departure time.",
        };
        return res.redirect("/web/admin/view/trips");
      }

      // 4. Validate Referenced Documents Exist
      const [route, bus, driver] = await Promise.all([
        Route.findOne({ _id: routeId, isDeleted: false }),
        Bus.findOne({ _id: busId, isDeleted: false }),
        Driver.findOne({ _id: driverId, isDeleted: false }),
      ]);

      if (!route) {
        req.session.errors = { trip: "Selected route does not exist." };
        return res.redirect("/web/admin/view/trips");
      }

      if (!bus) {
        req.session.errors = { trip: "Selected bus does not exist." };
        return res.redirect("/web/admin/view/trips");
      }

      if (!driver) {
        req.session.errors = { trip: "Selected driver does not exist." };
        return res.redirect("/web/admin/view/trips");
      }

      // 5. Numeric Validations
      const parsedFare = Number(baseFare);
      if (isNaN(parsedFare) || parsedFare < 0) {
        req.session.errors = {
          trip: "Base fare must be a valid positive number.",
        };
        return res.redirect("/web/admin/view/trips");
      }

      // 6. Update Document Fields
      existingTrip.routeId = routeId;
      existingTrip.busId = busId;
      existingTrip.driverId = driverId;
      existingTrip.departureAt = departureDate;
      existingTrip.arrivalAt = arrivalDate;
      existingTrip.baseFare = parsedFare;
      existingTrip.availableSeats =
        availableSeats !== undefined ? Number(availableSeats) : bus.totalSeats;
      existingTrip.status = status || existingTrip.status;

      await existingTrip.save();

      logger.info(`Trip Updated: ${existingTrip._id}`);

      await activityLogger(req, {
        userId: req.user?.id,
        module: "Trip",
        action: "Update",
        description: `Updated trip scheduling for Trip ID: ${existingTrip._id}`,
        documentId: existingTrip._id,
      });

      req.session.success = "Trip schedule updated successfully!";
      return res.redirect("/web/admin/view/trips");
    } catch (error) {
      logger.error(`Update Trip Error: ${error.message}`);
      req.session.errors = { trip: "Failed to update trip: " + error.message };
      return res.redirect("/web/admin/view/trips");
    }
  }
}
module.exports = new TripController();
