const mongoose = require("mongoose");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Trip = require("../../models/Trip");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Payment = require("../../models/Payment");
const Passenger = require("../../models/Passenger");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");
const razorpay = require("../../config/razorpay");

class BookingController {
  viewBookings(req, res) {
    return res.render("customer/bookings");
  }

  async viewCheckout(req, res) {
    try {
      const bookingData = req.session.bookingData;
      if (!bookingData) {
        return res.redirect("/web/search/view/result");
      }
      // -----------------------------------------
      // Get trip details
      // -----------------------------------------

      const showTripDetail = await Trip.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(bookingData.tripId),
          },
        },

        // Trip → Route
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

        // Route → Origin Stop
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

        // Route → Destination Stop
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
      ]);

      if (!showTripDetail.length) {
        logger.warn(`Trip not found: ${bookingData.tripId}`);
        return res.redirect("/web/search/view/result");
      }

      // -----------------------------------------
      // Check whether Razorpay order already exists
      // -----------------------------------------

      let paymentData = null;

      if (req.session.paymentId) {
        paymentData = await Payment.findById(req.session.paymentId);
      }

      // -----------------------------------------
      // Render checkout
      // -----------------------------------------

      const paymentError = req.session.paymentError || null;

      delete req.session.paymentError;

      return res.render("customer/payment_checkout", {
        bookingData,
        trip: showTripDetail[0],
        paymentData,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        paymentError,
      });
    } catch (error) {
      logger.error(`Checkout Error: ${error.message}`);
      return res.redirect("/web/search/view/result");
    }
  }

  async initateBooking(req, res) {
    try {
      const {
        tripId,
        seats,
        passengers,
        contactEmail,
        contactPhone,
        boardingPoint,
        dropoffPoint,
        totalAmount,
      } = req.body;

      // Convert seats into an array
      let seatNumbers = [];

      if (Array.isArray(seats)) {
        seatNumbers = seats;
      } else if (typeof seats === "string") {
        seatNumbers = seats
          .split(",")
          .map((seat) => seat.trim())
          .filter(Boolean);
      }

      // Convert passengers into JSON
      let passengerDetails = passengers;

      if (typeof passengers === "string") {
        try {
          passengerDetails = JSON.parse(passengers);
        } catch (error) {
          logger.error(`Passenger JSON Parse Error: ${error.message}`);

          req.session.errors = {
            passengers: "Invalid passenger details.",
          };
          return res.redirect("/web/search/view/result");
        }
      }

      // Save booking temporarily
      req.session.bookingData = {
        tripId,
        seats: seatNumbers,
        passengers: passengerDetails,
        contactEmail,
        contactPhone,
        boardingPoint,
        dropoffPoint,
        totalAmount: Number(totalAmount),
      };

      // User already logged in?
      if (req.user) {
        // Attach logged-in customer
        req.session.bookingData.userId = req.user.id;
        logger.info(
          `Booking initiated by customer ${req.user.email} for trip ${tripId}`,
        );

        return req.session.save((error) => {
          if (error) {
            logger.error(`Booking Session Save Error: ${error.message}`);
            req.session.errors = {
              booking: "Unable to save booking details.",
            };
            return res.redirect("/web/search/view/result");
          }
          return res.redirect("/web/customer/view/booking/checkout");
        });
      }
      // User is NOT logged in
      // Remember where the user should go after login
      req.session.redirectAfterLogin = "/web/customer/view/booking/checkout";

      logger.info(
        `Guest initiated booking for trip ${tripId}. Redirecting to login.`,
      );

      return req.session.save((error) => {
        if (error) {
          logger.error(`Booking Session Save Error: ${error.message}`);
          req.session.errors = {
            booking: "Unable to save booking details.",
          };
          return res.redirect("/web/search/view/result");
        }

        return res.redirect("/web/auth/view/login");
      });
    } catch (error) {
      logger.error(`Initiate Booking Error: ${error.message}`);

      req.session.errors = {
        booking: "Something went wrong while initiating your booking.",
      };
      return res.redirect("/web/search/view/result");
    }
  }
}
module.exports = new BookingController();
