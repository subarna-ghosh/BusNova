const mongoose = require("mongoose");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Trip = require("../../models/Trip");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Payment = require("../../models/Payment");
const Passenger = require("../../models/Passenger");
const Notification = require("../../models/Notification");
const createAdminNotification = require("../../utils/adminNotification");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");
const razorpay = require("../../config/razorpay");

class BookingController {
  async viewBookings(req, res) {
    try {
      const userId = new mongoose.Types.ObjectId(req.user.id);

      const findBooking = await Booking.aggregate([
        // 1. Get bookings of logged-in user
        {
          $match: {
            userId: userId,
            isDeleted: false,
          },
        },

        // 2. Get trip
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

        // 3. Get route
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

        // 4. Get origin stop
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

        // 5. Get destination stop
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

        // 6. Optional: newest booking first
        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);

      console.log("BOOKINGS:", findBooking);

      const notifications = await Notification.find({
        isDeleted: false,
        status: "sent",
        $or: [
          { audience: "all" },
          { audience: "Customer" },
          { audience: "specific_user", userId: userId },
        ],
      })
        .sort({ sentAt: -1 })
        .limit(10)
        .lean();

      return res.render("customer/bookings", {
        username: req.user.name,
        findBooking,
        notifications,
      });
    } catch (error) {
      logger.error(`Booking History Error: ${error.message}`);

      return res.status(500).render("error", {
        message: "Unable to load booking history",
      });
    }
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

      const notifications = await Notification.find({
        isDeleted: false,
        status: "sent",
        $or: [
          { audience: "all" },
          { audience: "Customer" },
          { audience: "specific_user", userId: req.user.id },
        ],
      })
        .sort({ sentAt: -1 })
        .limit(10)
        .lean();

      return res.render("customer/payment_checkout", {
        bookingData,
        trip: showTripDetail[0],
        paymentData,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        paymentError,
        username: req.user.name,
        notifications,
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

  async cancelBooking(req, res) {
    try {
      const { bookingId } = req.params;
      const userId = req.user.id;

      // -----------------------------------------
      // 1. Find confirmed booking belonging to user
      // -----------------------------------------

      const booking = await Booking.findOne({
        _id: bookingId,
        userId,
        bookingStatus: "confirmed",
        isDeleted: false,
      });

      if (!booking) {
        logger.warn(`Booking not found or already cancelled: ${bookingId}`);

        return res.redirect("/web/customer/view/upcoming/trip");
      }

      // -----------------------------------------
      // 2. Get trip
      // -----------------------------------------

      const trip = await Trip.findOne({
        _id: booking.tripId,
        isDeleted: false,
      });

      if (!trip) {
        logger.warn(`Trip not found: ${booking.tripId}`);

        return res.redirect("/web/customer/view/upcoming/trip");
      }

      // -----------------------------------------
      // 3. Don't allow cancellation after departure
      // -----------------------------------------

      if (new Date() >= new Date(trip.departureAt)) {
        logger.warn(`Cancellation after departure: ${booking._id}`);

        return res.redirect("/web/customer/view/upcoming/trip");
      }

      // -----------------------------------------
      // 4. Don't allow cancellation for completed/departed trip
      // -----------------------------------------

      if (
        trip.status === "departed" ||
        trip.status === "completed" ||
        trip.status === "cancelled"
      ) {
        return res.redirect("/web/customer/view/upcoming/trip");
      }

      // -----------------------------------------
      // 5. Get captured payment
      // -----------------------------------------

      const payment = await Payment.findOne({
        bookingId: booking._id,
        userId,
        status: "captured",
      });

      if (!payment) {
        logger.warn(`Captured payment not found: ${booking._id}`);

        return res.redirect("/web/customer/view/upcoming/trip");
      }

      if (!payment.razorpayPaymentId) {
        logger.warn(`Razorpay payment ID missing: ${payment._id}`);

        return res.redirect("/web/customer/view/upcoming/trip");
      }

      // -----------------------------------------
      // 6. Refund through Razorpay
      // -----------------------------------------

      const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: Math.round(payment.amount * 100),
        speed: "normal",
      });

      logger.info(
        `Refund created: ${refund.id} for payment ${payment.razorpayPaymentId}`,
      );

      // -----------------------------------------
      // 7. Release ONLY seats that are actually
      //    booked in this trip
      // -----------------------------------------

      const bookingSeats = booking.seatNumbers;

      if (!Array.isArray(bookingSeats) || bookingSeats.length === 0) {
        logger.warn(`No seats found for booking ${booking._id}`);

        return res.redirect("/web/customer/view/upcoming/trip");
      }

      // Count how many of this booking's seats
      // are actually present in the trip.
      const bookedSeatsToRelease = bookingSeats.filter((seat) =>
        trip.bookedSeatNumbers.includes(seat),
      );

      if (bookedSeatsToRelease.length > 0) {
        await Trip.findOneAndUpdate(
          {
            _id: trip._id,

            // Make sure these exact seats are still booked
            bookedSeatNumbers: {
              $all: bookedSeatsToRelease,
            },
          },
          {
            // Increase only by seats actually released
            $inc: {
              availableSeats: bookedSeatsToRelease.length,
            },

            // Remove those seats
            $pull: {
              bookedSeatNumbers: {
                $in: bookedSeatsToRelease,
              },
            },
          },
          {
            new: true,
          },
        );

        logger.info(
          `Released ${bookedSeatsToRelease.length} seats for booking ${booking.bookingCode}: ${bookedSeatsToRelease.join(", ")}`,
        );
      } else {
        logger.warn(
          `No booked seats found to release for booking ${booking.bookingCode}`,
        );
      }

      // -----------------------------------------
      // 8. Update Payment
      // -----------------------------------------

      await Payment.findByIdAndUpdate(
        payment._id,
        {
          status: "refunded",
          refundId: refund.id,
          refundedAmount: refund.amount / 100,
          refundedAt: new Date(),
        },
        {
          new: true,
        },
      );

      // -----------------------------------------
      // 9. Cancel Booking
      // -----------------------------------------

      booking.bookingStatus = "cancelled";
      await booking.save();

      // notify admin
      await createAdminNotification({
        title: "Booking Cancelled",
        message: `Booking ${booking.bookingCode} has been cancelled.`,
        type: "cancellation",
        referenceId: booking._id,
      });

      logger.info(`Booking ${booking.bookingCode} cancelled by user ${userId}`);

      // -----------------------------------------
      // 10. Redirect
      // -----------------------------------------

      return res.redirect("/web/customer/view/upcoming/trip");
    } catch (error) {
      logger.error(`Cancel booking error: ${error.message}`);

      return res.redirect("/web/customer/view/upcoming/trip");
    }
  }
}
module.exports = new BookingController();
