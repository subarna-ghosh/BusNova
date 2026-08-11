const mongoose = require("mongoose");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Trip = require("../../models/Trip");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Payment = require("../../models/Payment");
const Passenger = require("../../models/Passenger");
const AdminNotification = require("../../models/AdminNotification");
const Coupon = require("../../models/Coupon");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class BookingController {
  async viewBookings(req, res) {
    try {
      const adminNotifications = await AdminNotification.find({
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      const bookings = await Booking.aggregate([
        {
          $match: {
            isDeleted: false,
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
          $sort: {
            createdAt: -1,
          },
        },
        {
          $project: {
            bookingCode: 1,
            seatNumbers: 1,
            baseAmount: 1,
            discountAmount: 1,
            totalAmount: 1,
            bookingStatus: 1,
            createdAt: 1,

            "user.name": 1,
            "user.email": 1,
            "user.phone": 1,

            "trip.departureAt": 1,
            "trip.arrivalAt": 1,

            "originStop.name": 1,
            "originStop.city": 1,

            "destinationStop.name": 1,
            "destinationStop.city": 1,
          },
        },
      ]);

      logger.info(`Admin booking list fetched: ${bookings.length}`);

      return res.render("admin/dashboard/bookings", {
        findBooking: bookings,
        findAdmin: req.user.name,
        adminNotifications,
      });
    } catch (error) {
      logger.error(`View bookings error: ${error.message}`);

      return res.redirect("/web/admin/view/dashboard");
    }
  }

  async exportBookings(req, res) {
    try {
      const bookings = await Booking.aggregate([
        // -----------------------------------------
        // USER
        // -----------------------------------------
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "customer",
          },
        },

        {
          $unwind: {
            path: "$customer",
            preserveNullAndEmptyArrays: true,
          },
        },

        // -----------------------------------------
        // TRIP
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
        // ROUTE
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
        // ORIGIN STOP
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
        // DESTINATION STOP
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
        // PAYMENT
        // -----------------------------------------
        {
          $lookup: {
            from: "payments",
            localField: "paymentId",
            foreignField: "_id",
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
        // FINAL DATA
        // -----------------------------------------
        {
          $project: {
            _id: 0,
            bookingCode: 1,

            customerName: {
              $ifNull: ["$customer.name", "N/A"],
            },

            customerEmail: {
              $ifNull: ["$customer.email", "N/A"],
            },

            origin: {
              $ifNull: ["$originStop.city", "$originStop.name"],
            },

            destination: {
              $ifNull: ["$destinationStop.city", "$destinationStop.name"],
            },

            travelDate: "$trip.departureAt",
            seatNumbers: 1,
            totalAmount: 1,
            bookingStatus: 1,
            paymentStatus: {
              $ifNull: ["$payment.status", "N/A"],
            },

            bookingDate: "$createdAt",
          },
        },

        {
          $sort: {
            bookingDate: -1,
          },
        },
      ]);

      // -----------------------------------------
      // CSV HEADER
      // -----------------------------------------

      const headers = [
        "Booking Code",
        "Customer",
        "Email",
        "Origin",
        "Destination",
        "Travel Date",
        "Seats",
        "Amount",
        "Booking Status",
        "Payment Status",
        "Booking Date",
      ];

      // -----------------------------------------
      // CSV ROWS
      // -----------------------------------------

      const rows = bookings.map((booking) => {
        return [
          booking.bookingCode || "",
          booking.customerName || "",
          booking.customerEmail || "",
          booking.origin || "",
          booking.destination || "",

          booking.travelDate
            ? new Date(booking.travelDate).toLocaleString("en-IN")
            : "",

          Array.isArray(booking.seatNumbers)
            ? booking.seatNumbers.join(", ")
            : "",

          booking.totalAmount ?? 0,

          booking.bookingStatus || "",

          booking.paymentStatus || "",

          booking.bookingDate
            ? new Date(booking.bookingDate).toLocaleString("en-IN")
            : "",
        ];
      });

      // -----------------------------------------
      // ESCAPE CSV VALUES
      // -----------------------------------------

      const escapeCSV = (value) => {
        const stringValue = String(value ?? "");

        return `"${stringValue.replace(/"/g, '""')}"`;
      };

      // -----------------------------------------
      // CREATE CSV
      // -----------------------------------------

      const csv = [
        headers.map(escapeCSV).join(","),
        ...rows.map((row) => row.map(escapeCSV).join(",")),
      ].join("\n");

      // -----------------------------------------
      // DOWNLOAD FILE
      // -----------------------------------------

      res.setHeader("Content-Type", "text/csv; charset=utf-8");

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="busnova-bookings-${Date.now()}.csv"`,
      );

      return res.send(csv);
    } catch (error) {
      logger.error(`Export bookings error: ${error.message}`);

      return res.redirect("/web/admin/view/bookings/list");
    }
  }
}
module.exports = new BookingController();
