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

      // -----------------------------------------
      // 1. Fetch unique origin & destination options
      // -----------------------------------------
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

      const origins = originsData.map((item) => item._id);
      const destinations = destinationsData.map((item) => item._id);

      // -----------------------------------------
      // 2. Build date match criteria
      // -----------------------------------------
      const matchCriteria = {
        isDeleted: false,
        status: "scheduled",
      };

      if (departDate) {
        const start = new Date(departDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(departDate);
        end.setHours(23, 59, 59, 999);

        matchCriteria.departureAt = {
          $gte: start,
          $lte: end,
        };
      }

      // -----------------------------------------
      // 3. Fetch matching trips
      // -----------------------------------------
      const tripPipeline = [
        { $match: matchCriteria },

        // Trip → Route
        {
          $lookup: {
            from: "routes",
            localField: "routeId",
            foreignField: "_id",
            as: "route",
          },
        },
        { $unwind: "$route" },

        // Trip → Bus
        {
          $lookup: {
            from: "buses",
            localField: "busId",
            foreignField: "_id",
            as: "bus",
          },
        },
        { $unwind: "$bus" },

        // Bus → Seat Layout
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

        // Route → Origin Stop
        {
          $lookup: {
            from: "stops",
            localField: "route.originStopId",
            foreignField: "_id",
            as: "originStop",
          },
        },
        { $unwind: "$originStop" },

        // Route → Destination Stop
        {
          $lookup: {
            from: "stops",
            localField: "route.destinationStopId",
            foreignField: "_id",
            as: "destinationStop",
          },
        },
        { $unwind: "$destinationStop" },
      ];

      // Filter by City Names if provided in req.query
      if (from) {
        tripPipeline.push({ $match: { "originStop.city": from } });
      }
      if (to) {
        tripPipeline.push({ $match: { "destinationStop.city": to } });
      }

      // Continue with Bookings & Seat Calculation
      tripPipeline.push(
        {
          $lookup: {
            from: "bookings",
            let: { tripId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$tripId", "$$tripId"] },
                  bookingStatus: "confirmed",
                  isDeleted: false,
                },
              },
              { $project: { seatNumbers: 1 } },
            ],
            as: "bookings",
          },
        },
        {
          $addFields: {
            bookedSeatNumbers: {
              $reduce: {
                input: "$bookings",
                initialValue: [],
                in: { $concatArrays: ["$$value", "$$this.seatNumbers"] },
              },
            },
          },
        },
        {
          $addFields: {
            availableSeats: {
              $subtract: ["$bus.totalSeats", { $size: "$bookedSeatNumbers" }],
            },
          },
        },
        { $project: { bookings: 0 } },
      );

      const trips = await Trip.aggregate(tripPipeline);

      // -----------------------------------------
      // 4. Render
      // -----------------------------------------
      return res.render("frontend/search_result", {
        origins,
        destinations,
        trips,
        queryParams: {
          from,
          to,
          departDate,
        },
      });
    } catch (error) {
      console.error("Error in viewSearches:", error);
      return res.status(500).render("error", {
        message: "Server Error",
      });
    }
  }
}
module.exports = new SearchController();
