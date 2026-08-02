const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const SeatLayout = require("../../models/Seat");
const Bus = require("../../models/Bus");
const Route = require("../../models/Route");
const Trip = require("../../models/Trip");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class TripController {
  async viewTrips(req, res) {
    return res.render("admin/dashboard/trips");
  }
}
module.exports = new TripController();
