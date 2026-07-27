const express = require("express");
const Router = express.Router();
const AuthController = require("../../controllers/auth/AuthController");

Router.get("/view/register", AuthController.viewRegister);
// Router.post("/save/register", AuthController.saveRegister);
Router.get("/view/login", AuthController.viewLogin);
Router.get("/view/forgot-password", AuthController.viewForgotPasword);

module.exports = Router;
