const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const sendEmail = require("../../utils/sendEmail");
const logger = require("../../utils/logger");
const {
  createAccessToken,
  createRefreshToken,
} = require("../../utils/createToken");
const activityLogger = require("../../helpers/activityLogger");

class StaffController {
  viewStaffDashboard(req, res) {
    return res.render("staff/staff_dashboard");
  }
}
module.exports = new StaffController();
