const mongoose = require("mongoose");
const crypto = require("crypto");
const socket = require("../../config/socket");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Trip = require("../../models/Trip");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Payment = require("../../models/Payment");
const Coupon = require("../../models/Coupon");
const Passenger = require("../../models/Passenger");
const Notification = require("../../models/Notification");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");
const razorpay = require("../../config/razorpay");
const createAdminNotification = require("../../utils/adminNotification");
class PaymentController {
  async viewPaymentHistory(req, res) {
    try {
      const userId = new mongoose.Types.ObjectId(req.user.id);
      const listPayment = await Payment.aggregate([
        {
          $match: {
            userId: userId,
          },
        },
        {
          $lookup: {
            from: "bookings",
            localField: "bookingId",
            foreignField: "_id",
            as: "booking",
          },
        },
        {
          $unwind: {
            path: "$booking",
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);
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

      return res.render("customer/payment_history", {
        username: req.user.name,
        listPayment,
        notifications,
      });
    } catch (error) {
      logger.error(`Booking History Error: ${error.message}`);
    }
  }

  async viewPaymentSummary(req, res) {
    try {
      // Get booking ID from URL first,
      // otherwise get it from session after payment
      const bookingId =
        req.params.bookingId || req.session.paymentSummary?.bookingId;

      if (!bookingId) {
        return res.redirect("/web/customer/view/upcoming/trip");
      }

      const userId = req.user.id;

      // -----------------------------------------
      // User Details
      // -----------------------------------------

      const user = await User.findOne({
        _id: userId,
        isDeleted: false,
      }).select("name email phone");

      // -----------------------------------------
      // Get confirmed booking
      // -----------------------------------------

      const booking = await Booking.findOne({
        _id: bookingId,
        userId,
        bookingStatus: "confirmed",
        isDeleted: false,
      });

      if (!booking) {
        logger.warn(`Confirmed booking not found: ${bookingId}`);

        return res.redirect("/web/customer/view/upcoming/trip");
      }

      // -----------------------------------------
      // Get captured payment
      // -----------------------------------------

      const payment = await Payment.findOne({
        bookingId: booking._id,
        userId,
        status: "captured",
      });

      if (!payment) {
        logger.warn(`Captured payment not found for booking: ${booking._id}`);

        return res.redirect("/web/customer/view/upcoming/trip");
      }

      // -----------------------------------------
      // Get passengers
      // -----------------------------------------

      const passengers = await Passenger.find({
        bookingId: booking._id,
        isDeleted: false,
      }).sort({ seatNumber: 1 });

      // -----------------------------------------
      // Get trip + route + stops
      // -----------------------------------------

      const tripResult = await Trip.aggregate([
        {
          $match: {
            _id: booking.tripId,
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

      if (!tripResult.length) {
        logger.warn(`Trip not found: ${booking.tripId}`);

        return res.redirect("/web/customer/view/upcoming/trip");
      }

      const trip = tripResult[0];

      // notification
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

      // -----------------------------------------
      // Render payment summary
      // -----------------------------------------

      return res.render("customer/payment_summary", {
        booking,
        payment,
        passengers,
        trip,
        user,
        username: req.user.name,
        notifications,
      });
    } catch (error) {
      logger.error(`Payment summary error: ${error.message}`);

      return res.redirect("/web/customer/view/upcoming/trip");
    }
  }

  async createOrder(req, res) {
    let reservedTripId = null;
    let reservedSeatNumbers = [];

    try {
      const bookingData = req.session.bookingData;
      if (!bookingData) {
        return res.redirect("/web/search/view/result");
      }

      // -----------------------------------------
      // Get logged-in user
      // -----------------------------------------

      const userId = req.user.id;

      if (!userId) {
        logger.error("User ID missing from JWT payload");
        return res.redirect("/web/auth/view/login");
      }

      // -----------------------------------------
      // Convert seats into array
      // -----------------------------------------

      const seatNumbers = Array.isArray(bookingData.seats)
        ? bookingData.seats.map((seat) => String(seat).trim())
        : String(bookingData.seats)
            .split(",")
            .map((seat) => seat.trim())
            .filter(Boolean);

      if (!seatNumbers.length) {
        req.session.paymentError = "Please select at least one seat.";

        return req.session.save(() => {
          return res.redirect("/web/customer/view/booking/checkout");
        });
      }

      // -----------------------------------------
      // Prevent duplicate order creation
      // -----------------------------------------

      if (req.session.paymentId) {
        return res.redirect("/web/customer/view/booking/checkout");
      }

      // -----------------------------------------
      // Amount
      // -----------------------------------------

      const totalAmount = Number(bookingData.totalAmount);

      if (!totalAmount || totalAmount <= 0) {
        logger.warn("Invalid booking amount");

        return res.redirect("/web/search/view/result");
      }

      // -----------------------------------------
      // 1. Reserve seats atomically
      // -----------------------------------------

      const trip = await Trip.findOneAndUpdate(
        {
          _id: bookingData.tripId,
          bookedSeatNumbers: {
            $nin: seatNumbers,
          },
          availableSeats: {
            $gte: seatNumbers.length,
          },
        },
        {
          $inc: {
            availableSeats: -seatNumbers.length,
          },

          $addToSet: {
            bookedSeatNumbers: {
              $each: seatNumbers,
            },
          },
        },
        {
          new: true,
        },
      );

      if (!trip) {
        logger.warn(`Seat reservation failed for trip ${bookingData.tripId}`);

        req.session.paymentError =
          "One or more selected seats are no longer available.";

        return req.session.save(() => {
          return res.redirect("/web/customer/view/booking/checkout");
        });
      }

      // Remember what we reserved.
      reservedTripId = trip._id;
      reservedSeatNumbers = seatNumbers;

      logger.info(
        `Seats reserved: ${seatNumbers.join(", ")} for trip ${trip._id}`,
      );

      // -----------------------------------------
      // 2. Create Razorpay Order
      // -----------------------------------------

      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      });

      logger.info(`Razorpay order created: ${razorpayOrder.id}`);

      // -----------------------------------------
      // 3. Generate Booking Code
      // -----------------------------------------

      const bookingCode =
        "BN-" + crypto.randomBytes(3).toString("hex").toUpperCase();

      // -----------------------------------------
      // 4. Create Pending Booking
      // -----------------------------------------

      const booking = await Booking.create({
        bookingCode,
        userId,
        tripId: bookingData.tripId,
        seatNumbers,
        couponId: bookingData.couponId || null,
        baseAmount: Number(bookingData.baseAmount || totalAmount),
        discountAmount: Number(bookingData.discountAmount || 0),
        totalAmount,
        bookingStatus: "pending",
      });

      // notify admin
      await createAdminNotification({
        title: "New Booking",
        message: `New booking ${booking.bookingCode} has been created.`,
        type: "booking",
        referenceId: booking._id,
      });

      // -----------------------------------------
      // IMPORTANT
      // Store booking ID for failure cleanup
      // -----------------------------------------

      req.session.paymentBookingId = booking._id.toString();

      // -----------------------------------------
      // 5. Create Passenger Documents
      // -----------------------------------------

      if (
        Array.isArray(bookingData.passengers) &&
        bookingData.passengers.length > 0
      ) {
        const passengers = bookingData.passengers.map((passenger) => ({
          bookingId: booking._id,
          title: passenger.title,
          name: passenger.name,
          age: Number(passenger.age),
          seatNumber: passenger.seatNo,
        }));

        await Passenger.insertMany(passengers);

        logger.info(`Passenger documents created for booking ${booking._id}`);
      }

      // -----------------------------------------
      // 6. Create Payment
      // -----------------------------------------

      const payment = await Payment.create({
        bookingId: booking._id,
        userId,
        razorpayOrderId: razorpayOrder.id,
        amount: totalAmount,
        currency: "INR",
        status: "created",
      });

      logger.info(`Payment record created: ${payment._id}`);

      // -----------------------------------------
      // 7. Attach Payment to Booking
      // -----------------------------------------

      booking.paymentId = payment._id;

      await booking.save();

      // -----------------------------------------
      // 8. Store Payment ID in Session
      // -----------------------------------------

      req.session.paymentId = payment._id.toString();

      delete req.session.paymentError;

      // -----------------------------------------
      // 9. Save Session
      // -----------------------------------------

      return req.session.save((error) => {
        if (error) {
          logger.error(`Session Save Error: ${error.message}`);

          return res.redirect("/web/customer/view/booking/checkout");
        }

        return res.redirect("/web/customer/view/booking/checkout");
      });
    } catch (error) {
      logger.error(`Create Razorpay Order Error: ${error.message}`);

      // -----------------------------------------
      // IMPORTANT:
      // If seats were already reserved,
      // release them.
      // -----------------------------------------

      if (reservedTripId && reservedSeatNumbers.length) {
        await Trip.findByIdAndUpdate(reservedTripId, {
          $inc: {
            availableSeats: reservedSeatNumbers.length,
          },

          $pull: {
            bookedSeatNumbers: {
              $in: reservedSeatNumbers,
            },
          },
        });

        logger.info(
          `Released reserved seats after createOrder failure: ${reservedSeatNumbers.join(", ")}`,
        );
      }

      req.session.paymentError =
        "Unable to create the payment order. Please try again.";

      return req.session.save(() => {
        return res.redirect("/web/customer/view/booking/checkout");
      });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      // -----------------------------------------
      // 1. Verify Razorpay signature
      // -----------------------------------------

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        const payment = await Payment.findOneAndUpdate(
          {
            razorpayOrderId: razorpay_order_id,
          },
          {
            status: "failed",
          },
          {
            new: true,
          },
        );

        // Release seats
        if (payment) {
          const booking = await Booking.findById(payment.bookingId);

          if (booking && booking.bookingStatus === "pending") {
            await Trip.findByIdAndUpdate(booking.tripId, {
              $inc: {
                availableSeats: booking.seatNumbers.length,
              },

              $pull: {
                bookedSeatNumbers: {
                  $in: booking.seatNumbers,
                },
              },
            });

            booking.bookingStatus = "cancelled";

            await booking.save();
          }
        }

        logger.warn(
          `Invalid Razorpay signature for order ${razorpay_order_id}`,
        );

        req.session.paymentError =
          "Payment verification failed. Please try again.";

        return req.session.save(() => {
          return res.redirect("/web/customer/payment/failed");
        });
      }

      // -----------------------------------------
      // 2. Get Razorpay payment details
      // -----------------------------------------

      const razorpayPayment =
        await razorpay.payments.fetch(razorpay_payment_id);

      const paymentMethod = razorpayPayment.method || "unknown";

      // -----------------------------------------
      // 3. Update Payment
      // -----------------------------------------

      const payment = await Payment.findOneAndUpdate(
        {
          razorpayOrderId: razorpay_order_id,
        },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paymentMethod,
          status: "captured",
        },
        {
          new: true,
        },
      );

      if (!payment) {
        logger.warn(
          `Payment not found for Razorpay order ${razorpay_order_id}`,
        );

        req.session.paymentError = "Payment record could not be found.";

        return res.redirect("/web/customer/payment/failed");
      }

      // -----------------------------------------
      // 4. Confirm Booking
      // -----------------------------------------

      const booking = await Booking.findByIdAndUpdate(
        payment.bookingId,
        {
          bookingStatus: "confirmed",
        },
        {
          new: true,
        },
      );

      // notify admin
      await createAdminNotification({
        title: "Payment Successful",
        message: `Payment received for booking ${booking.bookingCode}.`,
        type: "payment",
        referenceId: payment._id,
      });

      if (!booking) {
        logger.warn(`Booking not found for payment ${payment._id}`);

        req.session.paymentError = "Booking could not be confirmed.";

        return res.redirect("/web/customer/payment/failed");
      }

      // -----------------------------------------
      // 5. Store booking ID for summary
      // -----------------------------------------

      req.session.paymentSummary = {
        bookingId: booking._id.toString(),
      };

      // -----------------------------------------
      // IMPORTANT
      // Remove failure-cleanup session data
      // -----------------------------------------

      delete req.session.paymentBookingId;

      // -----------------------------------------
      // 6. Clear checkout data
      // -----------------------------------------

      delete req.session.bookingData;
      delete req.session.paymentId;
      delete req.session.paymentError;

      // -----------------------------------------
      // 7. Go to Payment Summary
      // -----------------------------------------

      return req.session.save(() => {
        return res.redirect("/web/customer/view/payment/summary");
      });
    } catch (error) {
      logger.error(`Payment verification error: ${error.message}`);

      req.session.paymentError =
        "Payment verification failed. Please try again.";

      return res.redirect("/web/customer/payment/failed");
    }
  }

  async viewPaymentFailed(req, res) {
    try {
      const message =
        req.session.paymentError ||
        "Payment could not be completed. Please try again.";

      const bookingId = req.session.paymentBookingId;

      if (bookingId) {
        const booking = await Booking.findById(bookingId);

        if (booking && booking.bookingStatus === "pending") {
          // -----------------------------------------
          // Release seats
          // -----------------------------------------

          await Trip.findByIdAndUpdate(booking.tripId, {
            $inc: {
              availableSeats: booking.seatNumbers.length,
            },

            $pull: {
              bookedSeatNumbers: {
                $in: booking.seatNumbers,
              },
            },
          });

          // -----------------------------------------
          // Cancel booking
          // -----------------------------------------

          booking.bookingStatus = "cancelled";

          await booking.save();

          logger.info(`Seats released for failed booking ${booking._id}`);
        }
      }

      // -----------------------------------------
      // Clear session
      // -----------------------------------------

      delete req.session.paymentError;
      delete req.session.paymentBookingId;

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

      return res.render("customer/payment_failed", {
        message,
        username: req.user.name,
        notifications,
      });
    } catch (error) {
      logger.error(`Payment failed page error: ${error.message}`);

      return res.redirect("/web/customer/view/booking/checkout");
    }
  }

  async viewRefundedPayment(req, res) {
    try {
      const { bookingId } = req.params;
      const userId = req.user.id;

      // -----------------------------------------
      // 1. Find cancelled booking
      // -----------------------------------------

      const booking = await Booking.findOne({
        _id: bookingId,
        userId,
        bookingStatus: "cancelled",
        isDeleted: false,
      });

      if (!booking) {
        logger.warn(`Cancelled booking not found: ${bookingId}`);

        return res.redirect("/web/customer/view/payment/history");
      }

      // -----------------------------------------
      // 2. Get payment
      // -----------------------------------------

      const payment = await Payment.findOne({
        bookingId: booking._id,
        userId,
      });

      if (!payment) {
        logger.warn(`Payment not found for cancelled booking: ${booking._id}`);

        return res.redirect("/web/customer/view/payment/history");
      }

      // -----------------------------------------
      // 3. Get user details
      // -----------------------------------------

      const user = await User.findOne({
        _id: userId,
        isDeleted: false,
      }).select("name email phone");

      // -----------------------------------------
      // 4. Get trip + route + stops
      // -----------------------------------------

      const tripResult = await Trip.aggregate([
        {
          $match: {
            _id: booking.tripId,
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

        // Route → Origin
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

        // Route → Destination
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

      if (!tripResult.length) {
        logger.warn(`Trip not found: ${booking.tripId}`);

        return res.redirect("/web/customer/view/payment/history");
      }

      const trip = tripResult[0];

      // -----------------------------------------
      // 5. Get passengers
      // -----------------------------------------

      const passengers = await Passenger.find({
        bookingId: booking._id,
        isDeleted: false,
      }).sort({
        seatNumber: 1,
      });

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
      // -----------------------------------------
      // 6. Render refund page
      // -----------------------------------------

      return res.render("customer/payment_refunded", {
        booking,
        payment,
        trip,
        passengers,
        user,
        username: req.user.name,
        notifications,
      });
    } catch (error) {
      logger.error(`Refund details page error: ${error.message}`);

      return res.redirect("/web/customer/view/payment/history");
    }
  }
}
module.exports = new PaymentController();
