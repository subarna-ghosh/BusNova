const express = require("express");
const Router = express.Router();
const DriverController = require("../../controllers/driver/DriverController");
const validateWeb = require("../../middlewares/validateWebMiddleware");

Router.get("/view/dashboard", DriverController.viewDriverDashboard);

module.exports = Router;
