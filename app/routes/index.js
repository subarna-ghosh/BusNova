const express = require("express");
const Router = express.Router();

// web routes
const webAuthRoutes = require("./web/authRoutes");
Router.use("/web/auth", webAuthRoutes);


// api routes
// const apiAuthRoutes = require("./api/authRoutes");
// Router.use("/api/v1/auth", apiAuthRoutes);

module.exports = Router;
