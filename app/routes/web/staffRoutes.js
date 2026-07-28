const express = require("express");
const Router = express.Router();
const StaffController = require("../../controllers/staff/StaffController");
const validateWeb = require("../../middlewares/validateWebMiddleware");

Router.get("/view/dashboard", StaffController.viewStaffDashboard);

module.exports = Router;
