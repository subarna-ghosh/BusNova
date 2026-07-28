const express = require("express");
const Router = express.Router();
const CustomerController = require("../../controllers/customer/CustomerController");
const validateWeb = require("../../middlewares/validateWebMiddleware");

Router.get("/view/dashboard", CustomerController.viewCustomerDashboard);

module.exports = Router;
