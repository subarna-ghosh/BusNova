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
  async viewAdminDashboard(req, res) {
    try {
      const findAdmin = await User.findOne({
        _id: req.user.id,
        status: "active",
        isDeleted: false,
      });

      if (!findAdmin) {
        logger.warn(`Admin not found: ${req.user.id}`);
        return res.redirect("/web/auth/view/login");
      }

      return res.render("admin/dashboard/admin_dashboard", {
        findAdmin,
      });
    } catch (error) {
      logger.error(`Admin Dashboard Error: ${error.message}`);
      return res.redirect("/web/auth/view/login");
    }
  }
}
module.exports = new AdminController();
