const express = require("express");
const Router = express.Router();
const AuthController = require("../../controllers/auth/AuthController");
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("../../validations/authValidation");
const validateWeb = require("../../middlewares/validateWebMiddleware");

Router.get("/view/landing/page", AuthController.viewLandingPage);
Router.get("/view/register", AuthController.viewRegister);

Router.get("/view/login", AuthController.viewLogin);
Router.post(
  "/save/login",
  loginValidation,
  validateWeb("admin/auth/login"),
  AuthController.saveLogin,
);
Router.get("/view/forgot-password", AuthController.viewForgotPasword);

module.exports = Router;
