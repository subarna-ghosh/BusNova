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
      const listDestination = await Trip.aggregate([
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
        {
          $lookup: {
            from: "stops",
            localField: "route.destinationStopId",
            foreignField: "_id",
            as: "destinationStop",
          },
        },
        { $unwind: "$destinationStop" },
        {
          $group: {
            _id: {
              origin: "$route.originStopId",
              destination: "$route.destinationStopId",
            },
            originStop: { $first: "$originStop" },
            destinationStop: { $first: "$destinationStop" },
          },
        },
      ]);

      return res.render("frontend/landing_page", {
        destination: listDestination,
      });
    } catch (error) {
      logger.error(`Landing Page Error: ${error.message}`);
      return res.render("frontend/landing_page", { destination: [] });
    }
  }
}
module.exports = new HomeController();
