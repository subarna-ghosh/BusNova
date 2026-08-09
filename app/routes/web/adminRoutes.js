const express = require("express");
const Router = express.Router();
const AdminController = require("../../controllers/admin/AdminController");
const SeatController = require("../../controllers/admin/SeatController");
const BusController = require("../../controllers/admin/BusController");
const RouteController = require("../../controllers/admin/RouteController");
const TripController = require("../../controllers/admin/TripController");
const DriverController = require("../../controllers/admin/DriverController");
const StopController = require("../../controllers/admin/StopController");
const CouponController = require("../../controllers/admin/CouponController");
const CustomerController = require("../../controllers/admin/CustomerController");
const BookingController = require("../../controllers/admin/BookingController");
const validateWeb = require("../../middlewares/validateWebMiddleware");
const webProtect = require("../../middlewares/webProtect");
const roleCheck = require("../../middlewares/roleCheck");
const uploadDriverImage = require("../../utils/uploadImage");

Router.get(
  "/view/dashboard",
  webProtect,
  roleCheck("Admin"),
  AdminController.viewAdminDashboard,
);

// seat management routes
Router.get(
  "/view/seats",
  webProtect,
  roleCheck("Admin"),
  SeatController.viewSeats,
);

Router.post(
  "/seats/save",
  webProtect,
  roleCheck("Admin"),
  SeatController.saveSeatLayout,
);

// bus management routes
Router.get(
  "/view/buses",
  webProtect,
  roleCheck("Admin"),
  BusController.viewBuses,
);

Router.post(
  "/buses/save",
  webProtect,
  roleCheck("Admin"),
  BusController.saveBuses,
);

Router.post(
  "/buses/edit/:id",
  webProtect,
  roleCheck("Admin"),
  BusController.updateBus,
);

// stop management routes
Router.get(
  "/view/stops",
  webProtect,
  roleCheck("Admin"),
  StopController.viewStops,
);

Router.post(
  "/stops/save",
  webProtect,
  roleCheck("Admin"),
  StopController.addStop,
);

Router.post(
  "/stops/edit/:id",
  webProtect,
  roleCheck("Admin"),
  StopController.updateStop,
);

Router.post(
  "/stops/delete/:id",
  webProtect,
  roleCheck("Admin"),
  StopController.deleteStop,
);

// route management routes
Router.get(
  "/view/routes",
  webProtect,
  roleCheck("Admin"),
  RouteController.viewRoutes,
);

Router.post(
  "/routes/add",
  webProtect,
  roleCheck("Admin"),
  RouteController.addRoute,
);

Router.post(
  "/routes/edit/:id",
  webProtect,
  roleCheck("Admin"),
  RouteController.updateRoute,
);

// trip management routes
Router.get(
  "/view/trips",
  webProtect,
  roleCheck("Admin"),
  TripController.viewTrips,
);

Router.post(
  "/trip/save",
  webProtect,
  roleCheck("Admin"),
  TripController.createTrip,
);

Router.post(
  "/trip/update/:id",
  webProtect,
  roleCheck("Admin"),
  TripController.updateTrip,
);

// driver management routes
Router.get(
  "/view/drivers",
  webProtect,
  roleCheck("Admin"),
  DriverController.viewDrivers,
);

Router.post(
  "/driver/save",
  webProtect,
  roleCheck("Admin"),
  uploadDriverImage.single("profileImage"),
  DriverController.createDriver,
);

Router.post(
  "/driver/update/:id",
  webProtect,
  roleCheck("Admin"),
  uploadDriverImage.single("profileImage"),
  DriverController.updateDriver,
);

// coupon management routes
Router.get(
  "/view/coupons",
  webProtect,
  roleCheck("Admin"),
  CouponController.viewCoupons,
);

Router.post(
  "/coupon/save",
  webProtect,
  roleCheck("Admin"),
  CouponController.createCoupon,
);

Router.post(
  "/coupon/update/:id",
  webProtect,
  roleCheck("Admin"),
  CouponController.updateCoupon,
);

Router.post(
  "/coupon/delete/:id",
  webProtect,
  roleCheck("Admin"),
  CouponController.updateCoupon,
);

// customer management routes
Router.get(
  "/view/customers/list",
  webProtect,
  roleCheck("Admin"),
  CustomerController.viewCustomers,
);

// booking management routes
Router.get(
  "/view/bookings/list",
  webProtect,
  roleCheck("Admin"),
  BookingController.viewBookings,
);

module.exports = Router;
