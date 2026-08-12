const express = require("express");
const Router = express.Router();
const DriverController = require("../../controllers/driver/DriverController");
const PassengerListController = require("../../controllers/driver/PassengerListController");
const TripScheduleController = require("../../controllers/driver/TripScheduleController");
const validateWeb = require("../../middlewares/validateWebMiddleware");
const webProtect = require("../../middlewares/webProtect");
const roleCheck = require("../../middlewares/roleCheck");

// driver management routes
Router.get(
  "/view/dashboard",
  webProtect,
  roleCheck("Driver"),
  DriverController.viewDriverDashboard,
);

// passenger management routes
Router.get(
  "/view/passenger/list",
  webProtect,
  roleCheck("Driver"),
  PassengerListController.viewPassengers,
);

// trip schedule routes
Router.get(
  "/view/trip/schedule",
  webProtect,
  roleCheck("Driver"),
  TripScheduleController.viewSchedules,
);

module.exports = Router;
