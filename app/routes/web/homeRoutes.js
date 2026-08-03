const express = require("express");
const Router = express.Router();
const HomeController = require("../../controllers/frontend/HomeController");
const validateWeb = require("../../middlewares/validateWebMiddleware");

Router.get("/view/landing/page", HomeController.viewLandingPage);

module.exports = Router;
