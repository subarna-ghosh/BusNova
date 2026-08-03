const express = require("express");
const Router = express.Router();

// web routes
const webAuthRoutes = require("./web/authRoutes");
Router.use("/web/auth", webAuthRoutes);
const webAdminRoutes = require("./web/adminRoutes");
Router.use("/web/admin", webAdminRoutes);
const webCustomerRoutes = require("./web/customerRoutes");
Router.use("/web/customer", webCustomerRoutes);
const webDriverRoutes = require("./web/driverRoutes");
Router.use("/web/driver", webDriverRoutes);
const webStaffRoutes = require("./web/staffRoutes");
Router.use("/web/staff", webStaffRoutes);
const webHomeRoutes = require("./web/homeRoutes");
Router.use("/web/home", webHomeRoutes);
const webSearchResultRoutes = require("./web/searchRoutes");
Router.use("/web/search", webSearchResultRoutes);

// api routes
// const apiAuthRoutes = require("./api/authRoutes");
// Router.use("/api/v1/auth", apiAuthRoutes);

module.exports = Router;
