const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const SeatLayout = require("../../models/Seat");
const Bus = require("../../models/Bus");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

const formatStops = (stopsInput) => {
  if (!stopsInput) return [];
  const stopsArray = Array.isArray(stopsInput)
    ? stopsInput
    : Object.values(stopsInput);

  return stopsArray.map((s, index) => ({
    stopId: s.stopId,
    order: index + 1,
    arrivalOffsetMinutes: Number(s.arrivalOffsetMinutes) || 0,
  }));
};

class RouteController {
  async viewRoutes(req, res) {
    try {
      const showStops = await Stop.find({ isDeleted: false });
      const showRoutes = await Route.aggregate([
        {
          $match: { isDeleted: false },
        },
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

      return res.render("admin/dashboard/routes", {
        stops: showStops,
        routes: showRoutes,
        findAdmin: req.user.name,
      });
    } catch (error) {
      console.error("Error fetching routes:", error);
    }
  }

  async addRoute(req, res) {
    try {
      const {
        originStopId,
        destinationStopId,
        distanceKm,
        durationMinutes,
        status,
        stops,
      } = req.body;

      if (
        !originStopId ||
        !destinationStopId ||
        !distanceKm ||
        !durationMinutes
      ) {
        req.session.errors = {
          route: "All required fields are mandatory.",
        };

        logger.warn("Route creation failed: Required fields missing.");
        return res.redirect("/web/admin/view/routes");
      }

      if (originStopId === destinationStopId) {
        req.session.errors = {
          route: "Origin and Destination cannot be the same.",
        };

        logger.warn("Origin and Destination are same.");

        return res.redirect("/web/admin/view/routes");
      }

      const isExist = await Route.findOne({
        originStopId,
        destinationStopId,
        isDeleted: false,
      });

      if (isExist) {
        req.session.errors = {
          route: "Route already exists.",
        };

        logger.warn("Route already exists.");
        return res.redirect("/web/admin/view/routes");
      }

      const route = await Route.create({
        originStopId,
        destinationStopId,
        distanceKm: Number(distanceKm),
        durationMinutes: Number(durationMinutes),
        status: status || "active",
        stops: formatStops(stops),
      });

      logger.info("Route created successfully.");

      await activityLogger(req, {
        userId: req.user.id,
        module: "Route",
        action: "Create",
        description: "Created a new route.",
        documentId: route._id,
      });

      req.session.success = "Route created successfully.";

      return res.redirect("/web/admin/view/routes");
    } catch (error) {
      logger.error(`Add Route Error: ${error.message}`);

      req.session.errors = {
        route: "Something went wrong.",
      };
      return res.redirect("/web/admin/view/routes");
    }
  }

  async updateRoute(req, res) {
    try {
      const { id } = req.params;
      const {
        originStopId,
        destinationStopId,
        distanceKm,
        durationMinutes,
        status,
        stops,
      } = req.body;

      const route = await Route.findById(id);
      if (!route) {
        logger.warn(`Route not found : ${id}`);
        req.session.errors = { route: "Route not found." };
        return res.redirect("/web/admin/view/routes");
      }

      if (!originStopId || !destinationStopId) {
        req.session.errors = { route: "Origin and Destination are required." };
        return res.redirect("/web/admin/view/routes");
      }

      if (originStopId === destinationStopId) {
        req.session.errors = {
          route: "Origin and Destination cannot be the same.",
        };
        return res.redirect("/web/admin/view/routes");
      }

      route.originStopId = originStopId;
      route.destinationStopId = destinationStopId;
      route.distanceKm = Number(distanceKm);
      route.durationMinutes = Number(durationMinutes);
      route.status = status;
      route.stops = formatStops(stops);

      await route.save();

      logger.info(`Route Updated : ${route._id}`);

      await activityLogger(req, {
        userId: req.user.id,
        module: "Route",
        action: "Update",
        description: "Updated Route",
        documentId: route._id,
      });

      req.session.success = "Route updated successfully.";
      return res.redirect("/web/admin/view/routes");
    } catch (error) {
      logger.error(`Update Route Error : ${error.message}`);
      req.session.errors = { route: "Something went wrong." };
      return res.redirect("/web/admin/view/routes");
    }
  }
}
module.exports = new RouteController();
