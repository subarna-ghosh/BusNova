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
class SearchController {
  async viewSearches(req, res) {
    try {
      const { from, to, departDate } = req.query;

      // 1. Fetch all distinct origin and destination options for the top search bar dropdowns
      const listDestination = await Trip.aggregate([
        { $match: { isDeleted: false, status: "scheduled" } },
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
      ]);

      // 2. Build filter matching criteria if user filtered by search parameters
      const matchCriteria = { isDeleted: false };

      if (departDate) {
        const start = new Date(departDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(departDate);
        end.setHours(23, 59, 59, 999);
        matchCriteria.departureAt = { $gte: start, $lte: end };
      }

      // 3. Fetch matching trips with populated Route, Bus, and Stop details
      const trips = await Trip.aggregate([
        { $match: matchCriteria },
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
            from: "buses",
            localField: "busId",
            foreignField: "_id",
            as: "bus",
          },
        },
        { $unwind: "$bus" },
        {
          $lookup: {
            from: "seatlayouts",
            localField: "bus.seatLayoutId",
            foreignField: "_id",
            as: "bus.seatlayoutid",
          },
        },
        {
          $unwind: {
            path: "$bus.seatlayoutid",
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
      ]);

      return res.render("frontend/search_result", {
        destination: listDestination,
        trips: trips,
        queryParams: { from, to, departDate },
      });
    } catch (error) {
      console.error("Error in viewSearches:", error);
      return res.status(500).render("error", { message: "Server Error" });
    }
  }
}
module.exports = new SearchController();
