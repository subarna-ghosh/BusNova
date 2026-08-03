const express = require("express");
const Router = express.Router();
const SearchController = require("../../controllers/frontend/SearchController");
const validateWeb = require("../../middlewares/validateWebMiddleware");

Router.get("/view/result", SearchController.viewSearches);

module.exports = Router;
