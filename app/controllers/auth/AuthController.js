const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const sendEmail = require("../../utils/sendEmail");

class AuthController {
  viewRegister(req, res) {
    return res.render("admin/auth/register");
  }
    
  viewLogin(req, res) {
    return res.render("admin/auth/login");
  }

  viewForgotPasword(req, res) {
    return res.render("admin/auth/forgot_password");
  }
}
module.exports = new AuthController();
