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
class HomeController {
  async viewLandingPage(req, res) {
    try {
      // Unique Origin Cities
      const originsData = await Trip.aggregate([
        { $match: { isDeleted: false } },
        {
          $lookup: {
            from: "routes",
            localField: "routeId",
            foreignField: "_id",
            as: "route",
          },
        },
        { $unwind: "$route" },
        {
          $lookup: {
            from: "stops",
            localField: "route.originStopId",
            foreignField: "_id",
            as: "originStop",
          },
        },
        { $unwind: "$originStop" },
        { $group: { _id: "$originStop.city" } },
        { $sort: { _id: 1 } },
      ]);

      // Unique Destination Cities
      const destinationsData = await Trip.aggregate([
        { $match: { isDeleted: false } },
        {
          $lookup: {
            from: "routes",
            localField: "routeId",
            foreignField: "_id",
            as: "route",
          },
        },
        { $unwind: "$route" },
        {
          $lookup: {
            from: "stops",
            localField: "route.destinationStopId",
            foreignField: "_id",
            as: "destinationStop",
          },
        },
        { $unwind: "$destinationStop" },
        { $group: { _id: "$destinationStop.city" } },
        { $sort: { _id: 1 } },
      ]);

      return res.render("frontend/landing_page", {
        origins: originsData.map((item) => item._id),
        destinations: destinationsData.map((item) => item._id),
      });
    } catch (error) {
      logger.error(`Landing Page Error: ${error.message}`);
      return res.render("frontend/landing_page", {
        origins: [],
        destinations: [],
      });
    }
  }
}
module.exports = new HomeController();
