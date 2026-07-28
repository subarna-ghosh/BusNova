const express = require("express");
const Router = express.Router();
const AdminController = require("../../controllers/admin/AdminController");
const validateWeb = require("../../middlewares/validateWebMiddleware");

Router.get("/view/dashboard", AdminController.viewAdminDashboard);

module.exports = Router;

