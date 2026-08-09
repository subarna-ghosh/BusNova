const express = require("express");
const Router = express.Router();
const CustomerController = require("../../controllers/customer/CustomerController");
const PaymentController = require("../../controllers/customer/PaymentController");
const BookingController = require("../../controllers/customer/BookingController");
const UpcomingTripsController = require("../../controllers/customer/UpcomingTripsController");
const CancelledTripsController = require("../../controllers/customer/CancelledTripsController");
const FavouriteController = require("../../controllers/customer/FavouriteController");
const {
  bookingValidation,
  updateProfileValidation,
} = require("../../validations/frontendValidation");
const webProtect = require("../../middlewares/webProtect");
const webOptionalAuth = require("../../middlewares/webOptionalAuth");
const roleCheck = require("../../middlewares/roleCheck");
const validateWeb = require("../../middlewares/validateWebMiddleware");
const uploadImage = require("../../utils/uploadImage");

Router.get(
  "/view/dashboard",
  webProtect,
  roleCheck("Customer"),
  CustomerController.viewCustomerDashboard,
);

// customer profile
Router.post(
  "/profile/update",
  webProtect,
  uploadImage.single("profileImage"),
  updateProfileValidation,
  validateWeb("customer/customer_dashboard"),
  CustomerController.updateProfile,
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

Router.get(
  "/cancel/booking/:bookingId",
  webProtect,
  roleCheck("Customer"),
  BookingController.cancelBooking,
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
  "/view/payment/summary/:bookingId",
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

Router.get(
  "/payment/refunded/:bookingId",
  webProtect,
  roleCheck("Customer"),
  PaymentController.viewRefundedPayment,
);

// Upcoming trip management routes
Router.get(
  "/view/upcoming/trip",
  webProtect,
  roleCheck("Customer"),
  UpcomingTripsController.viewUpcomingTrips,
);

// cancelled trips management routes
Router.get(
  "/view/cancelled/trip",
  webProtect,
  roleCheck("Customer"),
  CancelledTripsController.viewCancelledTrips,
);

// favourite trips routes
Router.get(
  "/view/favourite/routes",
  webProtect,
  roleCheck("Customer"),
  FavouriteController.viewFavouriteRoutes,
);

module.exports = Router;
