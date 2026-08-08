const Role = require("../../models/Role");
const User = require("../../models/User");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class UpcomingTripsController {
  viewUpcomingTrip(req, res) {
    return res.render("customer/upcoming_trips");
  }
}
module.exports = new UpcomingTripsController();




