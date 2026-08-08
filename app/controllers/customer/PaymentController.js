const crypto = require("crypto");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Trip = require("../../models/Trip");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Payment = require("../../models/Payment");
const Coupon = require("../../models/Coupon");
const Passenger = require("../../models/Passenger");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");
const razorpay = require("../../config/razorpay");
class PaymentController {
  viewPaymentHistory(req, res) {
    return res.render("customer/payment_history");
  }

  async viewPaymentSummary(req, res) {
    try {
      const summaryData = req.session.paymentSummary;

      if (!summaryData || !summaryData.bookingId) {
        return res.redirect("/web/customer/view/upcoming/trip");
      }

      const userId = req.user.id;

      // -----------------------------------------
      // Get confirmed booking
      // -----------------------------------------

      const booking = await Booking.findOne({
        _id: summaryData.bookingId,
        userId,
        bookingStatus: "confirmed",
        isDeleted: false,
      });

      if (!booking) {
        logger.warn(`Confirmed booking not found: ${summaryData.bookingId}`);

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
      // Get passengers for this booking
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

      // -----------------------------------------
      // Render payment summary
      // -----------------------------------------

      return res.render("customer/payment_summary", {
        booking,
        payment,
        passengers,
        trip,
      });
    } catch (error) {
      logger.error(`Payment summary error: ${error.message}`);

      return res.redirect("/web/customer/view/upcoming/trip");
    }
  }

  async createOrder(req, res) {
    try {
      const bookingData = req.session.bookingData;
      if (!bookingData) {
        return res.redirect("/web/search/view/result");
      }

      const existingBooking = await Booking.findOne({
        tripId: bookingData.tripId,
        seatNumbers: { $in: bookingData.seats },
        bookingStatus: {
          $in: ["pending", "confirmed"],
        },
        isDeleted: false,
      });

      if (existingBooking) {
        return res.redirect("/web/customer/view/booking/checkout");
      }

      // -----------------------------------------
      // Prevent duplicate order creation
      // -----------------------------------------

      if (req.session.paymentId) {
        return res.redirect("/web/customer/view/booking/checkout");
      }

      // -----------------------------------------
      // Get logged-in user ID
      // -----------------------------------------

      const userId = req.user.id;

      if (!userId) {
        logger.error("User ID missing from JWT payload");
        return res.redirect("/web/auth/view/login");
      }

      logger.info(`Creating booking for user ${userId}`);

      // -----------------------------------------
      // Amount
      // -----------------------------------------

      const totalAmount = Number(bookingData.totalAmount);

      if (!totalAmount || totalAmount <= 0) {
        logger.warn("Invalid booking amount");

        return res.redirect("/web/search/view/result");
      }

      // -----------------------------------------
      // 1. Create Razorpay Order
      // -----------------------------------------

      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      });

      logger.info(`Razorpay order created: ${razorpayOrder.id}`);

      // -----------------------------------------
      // 2. Generate Booking Code
      // -----------------------------------------

      const bookingCode =
        "BN-" + crypto.randomBytes(3).toString("hex").toUpperCase();

      // -----------------------------------------
      // 3. Create Pending Booking
      // -----------------------------------------

      const booking = await Booking.create({
        bookingCode,

        // IMPORTANT
        // JWT contains "id", not "_id"
        userId,

        tripId: bookingData.tripId,

        seatNumbers: Array.isArray(bookingData.seats)
          ? bookingData.seats
          : bookingData.seats.split(",").map((seat) => seat.trim()),

        couponId: bookingData.couponId || null,

        baseAmount: Number(bookingData.baseAmount || totalAmount),

        discountAmount: Number(bookingData.discountAmount || 0),

        totalAmount,

        bookingStatus: "pending",
      });

      logger.info(`Pending booking created: ${booking._id}`);

      // -----------------------------------------
      // 4. Create Passenger Documents
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
      // 5. Create Payment
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
      // 6. Attach Payment to Booking
      // -----------------------------------------

      booking.paymentId = payment._id;

      await booking.save();

      // -----------------------------------------
      // 7. Store payment ID in session
      // -----------------------------------------

      req.session.paymentId = payment._id;

      // -----------------------------------------
      // 8. Clear any old payment error
      // -----------------------------------------

      delete req.session.paymentError;

      // -----------------------------------------
      // 9. Save session before redirect
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
        await Payment.findOneAndUpdate(
          {
            razorpayOrderId: razorpay_order_id,
          },
          {
            status: "failed",
          },
        );

        logger.warn(
          `Invalid Razorpay signature for order ${razorpay_order_id}`,
        );

        return res.redirect("/web/customer/view/booking/checkout");
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

      if (!booking) {
        logger.warn(`Booking not found for payment ${payment._id}`);

        return res.redirect("/web/customer/payment/failed");
      }

      // -----------------------------------------
      // 5. Store booking ID for summary
      // -----------------------------------------

      req.session.paymentSummary = {
        bookingId: booking._id.toString(),
      };

      // -----------------------------------------
      // 6. Clear temporary checkout data
      // -----------------------------------------

      delete req.session.bookingData;
      delete req.session.paymentId;

      // -----------------------------------------
      // 7. Go to Payment Summary
      // -----------------------------------------

      return res.redirect("/web/customer/view/payment/summary");
    } catch (error) {
      logger.error(`Payment verification error: ${error.message}`);

      return res.redirect("/web/customer/payment/failed");
    }
  }

  async viewPaymentFailed(req, res) {
    try {
      const message =
        req.session.paymentError ||
        "Payment could not be completed. Please try again.";

      delete req.session.paymentError;

      return res.render("customer/payment_failed", {
        message,
      });
    } catch (error) {
      logger.error(`Payment failed page error: ${error.message}`);

      return res.redirect("/web/customer/view/booking/checkout");
    }
  }
}
module.exports = new PaymentController();
