const express = require("express");
const Router = express.Router();
const AuthController = require("../../controllers/auth/AuthController");
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailValidation,
} = require("../../validations/authValidation");
const validateWeb = require("../../middlewares/validateWebMiddleware");

// landing page
Router.get("/view/landing/page", AuthController.viewLandingPage);

// register
Router.get("/view/register", AuthController.viewRegister);
Router.post(
  "/save/register",
  registerValidation,
  validateWeb("admin/auth/register"),
  AuthController.saveRegister,
);

// verify email
Router.get("/view/verify-email/:id", AuthController.verifyViewEmail);
Router.post(
  "/save/verify-email",
  verifyEmailValidation,
  validateWeb("admin/auth/verify_email"),
  AuthController.saveVerifyEmail,
);

// login
Router.get("/view/login", AuthController.viewLogin);
Router.post(
  "/save/login",
  loginValidation,
  validateWeb("admin/auth/login"),
  AuthController.saveLogin,
);

// forgot password
Router.get("/view/forgot-password", AuthController.viewForgotPasword);
Router.post(
  "/save/forgot-password",
  forgotPasswordValidation,
  validateWeb("admin/auth/forgot_password"),
  AuthController.forgotPassword,
);

// reset password
Router.get("/view/reset-password/:id/:token", AuthController.viewResetPassword);
Router.post(
  "/save/reset-password/:id/:token",
  resetPasswordValidation,
  validateWeb("admin/auth/reset_password"),
  AuthController.saveResetPassword,
);
module.exports = Router;
