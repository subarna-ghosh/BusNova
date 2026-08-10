const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const SeatLayout = require("../../models/Seat");
const Bus = require("../../models/Bus");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class BusController {
  async viewBuses(req, res) {
    const findBuses = await Bus.find({ isDeleted: false });
    const findSeatLayouts = await SeatLayout.find({ isDeleted: false });
    return res.render("admin/dashboard/buses", {
      seatLayouts: findSeatLayouts,
      buses: findBuses,
      findAdmin: req.user.name,
    });
  }

  async saveBuses(req, res) {
    try {
      const {
        busNumber,
        registrationNumber,
        busType,
        totalSeats,
        seatLayoutId,
        status,
        amenities,
      } = req.body;
      if (
        !busNumber ||
        !registrationNumber ||
        !busType ||
        !totalSeats ||
        !status
      ) {
        req.session.errors = {
          bus: "All required fields are mandatory.",
        };

        logger.warn("Bus creation failed. Required fields missing.");

        return res.redirect("/web/admin/view/buses");
      }

      const busExists = await Bus.findOne({
        busNumber,
        isDeleted: false,
      });
      if (busExists) {
        req.session.errors = {
          bus: "Bus number already exists.",
        };

        logger.warn(`Bus Number already exists : ${busNumber}`);

        return res.redirect("/web/admin/view/buses");
      }

      const registrationExists = await Bus.findOne({
        registrationNumber,
        isDeleted: false,
      });
      if (registrationExists) {
        req.session.errors = {
          bus: "Registration number already exists.",
        };

        logger.warn(
          `Registration Number already exists : ${registrationNumber}`,
        );

        return res.redirect("/web/admin/view/buses");
      }

      const formattedAmenities = Array.isArray(amenities)
        ? amenities
        : amenities
          ? [amenities]
          : [];

      const bus = await Bus.create({
        busNumber,
        registrationNumber,
        busType,
        totalSeats: Number(totalSeats),
        seatLayoutId: seatLayoutId || null,
        amenities: formattedAmenities,
        status,
      });

      logger.info(`Bus Created : ${busNumber}`);

      await activityLogger(req, {
        userId: req.user.id,
        module: "Bus",
        action: "Create",
        description: `Created Bus ${busNumber}`,
        documentId: bus._id,
      });

      req.session.success = "Bus created successfully.";

      return res.redirect("/web/admin/view/buses");
    } catch (error) {
      logger.error(`Create Bus Error : ${error.message}`);

      req.session.errors = {
        bus: "Something went wrong.",
      };

      return res.redirect("/web/admin/view/buses");
    }
  }

  async updateBus(req, res) {
    try {
      const { id } = req.params;

      const {
        busNumber,
        registrationNumber,
        busType,
        totalSeats,
        seatLayoutId,
        status,
        amenities,
      } = req.body;

      const bus = await Bus.findById(id);
      if (!bus) {
        logger.warn(`Bus not found : ${id}`);

        req.session.errors = {
          bus: "Bus not found.",
        };
        return res.redirect("/web/admin/view/buses");
      }

      const duplicate = await Bus.findOne({
        registrationNumber,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (duplicate) {
        logger.warn(
          `Registration Number already exists : ${registrationNumber}`,
        );

        req.session.errors = {
          bus: "Registration Number already exists.",
        };
        return res.redirect("/web/admin/view/buses");
      }

      const formattedAmenities = Array.isArray(amenities)
        ? amenities
        : amenities
          ? [amenities]
          : [];

      bus.busNumber = busNumber;
      bus.registrationNumber = registrationNumber;
      bus.busType = busType;
      bus.totalSeats = Number(totalSeats);
      bus.seatLayoutId = seatLayoutId || null;
      bus.status = status;
      bus.amenities = formattedAmenities;

      await bus.save();

      logger.info(`Bus Updated : ${bus.busNumber}`);

      await activityLogger(req, {
        userId: req.user.id,
        module: "Bus",
        action: "Update",
        description: `Updated Bus "${bus.busNumber}"`,
        documentId: bus._id,
      });

      req.session.success = "Bus updated successfully.";

      return res.redirect("/web/admin/view/buses");
    } catch (error) {
      logger.error(`Update Bus Error : ${error.message}`);

      req.session.errors = {
        bus: "Something went wrong.",
      };

      return res.redirect("/web/admin/view/buses");
    }
  }
}
module.exports = new BusController();
