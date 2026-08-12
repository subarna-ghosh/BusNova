const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const DriverProfile = require("../../models/DriverProfile");
const Passenger = require("../../models/Passenger");
const sendEmail = require("../../utils/sendEmail");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class PassengerListController {
  viewPassengers(req, res) {
    return res.render("driver/passenger_list");
  }
}
module.exports = new PassengerListController();
