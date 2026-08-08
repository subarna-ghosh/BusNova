const express = require("express");
const Router = express.Router();
const CustomerController = require("../../controllers/customer/CustomerController");
const PaymentController = require("../../controllers/customer/PaymentController");
const BookingController = require("../../controllers/customer/BookingController");
const UpcomingTripsController = require("../../controllers/customer/UpcomingTripsController");
const { bookingValidation } = require("../../validations/frontendValidation");
const webProtect = require("../../middlewares/webProtect");
const webOptionalAuth = require("../../middlewares/webOptionalAuth");
const roleCheck = require("../../middlewares/roleCheck");
const validateWeb = require("../../middlewares/validateWebMiddleware");

Router.get(
  "/view/dashboard",
  webProtect,
  roleCheck("Customer"),
  CustomerController.viewCustomerDashboard,
);

// booking management routes

// both logged-in and not-logged-in user shall reach this controller, so "webOptionalAuth"
Router.post(
  "/booking/initiate",
  webOptionalAuth,
  bookingValidation,
  validateWeb("frontend/search_result"),
  BookingController.initateBooking,
);

Router.get(
  "/view/bookings",
  webProtect,
  roleCheck("Customer"),
  BookingController.viewBookings,
);

Router.get(
  "/view/booking/checkout",
  webProtect,
  roleCheck("Customer"),
  BookingController.viewCheckout,
);

// payment management routes
Router.get(
  "/view/payment/history",
  webProtect,
  roleCheck("Customer"),
  PaymentController.viewPaymentHistory,
);

Router.post(
  "/create-order",
  webProtect,
  roleCheck("Customer"),
  PaymentController.createOrder,
);

Router.post(
  "/payment/verify",
  webProtect,
  roleCheck("Customer"),
  PaymentController.verifyPayment,
);

Router.get(
  "/view/payment/summary",
  webProtect,
  roleCheck("Customer"),
  PaymentController.viewPaymentSummary,
);

Router.get(
  "/payment/failed",
  webProtect,
  roleCheck("Customer"),
  PaymentController.viewPaymentFailed,
);

// Upcoming trip management routes
Router.get(
  "/view/upcoming/trip",
  webProtect,
  roleCheck("Customer"),
  UpcomingTripsController.viewUpcomingTrip,
);

module.exports = Router;
