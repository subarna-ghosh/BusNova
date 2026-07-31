const express = require("express");
const Router = express.Router();
const AdminController = require("../../controllers/admin/AdminController");
const validateWeb = require("../../middlewares/validateWebMiddleware");
const webProtect = require("../../middlewares/webProtect");
const roleCheck = require("../../middlewares/roleCheck");

Router.get(
  "/view/dashboard",
  webProtect,
  roleCheck("Admin"),
  AdminController.viewAdminDashboard,
);

module.exports = Router;
