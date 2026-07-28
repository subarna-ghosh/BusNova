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

class AdminController {
  viewAdminDashboard(req, res) {
    return res.render("admin/dashboard/admin_dashboard");
  }
}
module.exports = new AdminController();
