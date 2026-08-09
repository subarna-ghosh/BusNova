const mongoose = require("mongoose");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Trip = require("../../models/Trip");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Payment = require("../../models/Payment");
const Passenger = require("../../models/Passenger");
const Coupon = require("../../models/Coupon");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class CustomerController {
  async viewCustomers(req, res) {
    return res.render("admin/dashboard/customers");
  }
}
module.exports = new CustomerController();
