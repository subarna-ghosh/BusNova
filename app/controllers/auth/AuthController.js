const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Otp = require("../../models/Otp");
const sendEmail = require("../../utils/sendEmail");
const sendForgotPasswordEmail = require("../../utils/sendForgotEmail");
const logger = require("../../utils/logger");
const {
  createAccessToken,
  createRefreshToken,
} = require("../../utils/createToken");
const activityLogger = require("../../helpers/activityLogger");
class AuthController {
  viewLandingPage(req, res) {
    return res.render("frontend/landing_page");
  }

  viewRegister(req, res) {
    return res.render("admin/auth/register");
  }

  async saveRegister(req, res) {
    try {
      const { name, email, phone, password, agreeTerms } = req.body;

      // Validation
      if (
        !name?.trim() ||
        !email?.trim() ||
        !phone?.trim() ||
        !password?.trim()
      ) {
        logger.warn(
          `Registration failed. Missing required fields: ${email || "Unknown Email"}`,
        );
        return res.redirect("/web/auth/view/register");
      }

      if (!agreeTerms) {
        logger.warn(`Terms not accepted by: ${email}`);
        return res.redirect("/web/auth/view/register");
      }

      // Check Existing User
      const existingUser = await User.findOne({
        email,
        isDeleted: false,
      });

      if (existingUser) {
        logger.warn(`Registration failed. Email already exists: ${email}`);
        return res.redirect("/web/auth/view/register");
      }

      // Find Customer Role
      const customerRole = await Role.findOne({
        roleName: "Customer",
        isDeleted: false,
      });

      if (!customerRole) {
        logger.error("Customer role not found");
        return res.redirect("/web/auth/view/register");
      }

      // Hash Password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create User
      const user = await User.create({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: hashedPassword,
        roleId: customerRole._id,
      });

      // Send OTP Email
      try {
        await sendEmail(user);
      } catch (error) {
        // Rollback User if email sending fails
        await User.findByIdAndDelete(user._id);

        logger.error(`Registration rolled back: ${error.message}`);

        return res.redirect("/web/auth/view/register");
      }

      // Activity Log
      await activityLogger(req, {
        userId: user._id,
        module: "Auth",
        action: "Register",
        description: `${user.name} registered successfully`,
      });

      logger.info(`Customer registered successfully: ${email}`);

      return res.redirect(`/web/auth/view/verify-email/${user._id}`);
    } catch (error) {
      logger.error(`Registration Error: ${error.message}`);

      return res.redirect("/web/auth/view/register");
    }
  }

  async verifyViewEmail(req, res) {
    try {
      const { id } = req.params;

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        logger.warn(`Invalid User ID: ${id}`);
        return res.redirect("/web/auth/view/register");
      }

      const otpRecord = await Otp.findOne({
        userId: id,
      });
      if (!otpRecord) {
        logger.warn(`OTP not found for User ID: ${id}`);
        return res.redirect("/web/auth/view/register");
      }

      return res.render("admin/auth/verify_email", {
        userId: id,
      });
    } catch (error) {
      logger.error(`Verify Email View Error: ${error.message}`);
      return res.redirect("/web/auth/view/register");
    }
  }

  async saveVerifyEmail(req, res) {
    try {
      const { userId, otp } = req.body;

      const user = await User.findOne({
        _id: userId,
        isDeleted: false,
        status: "active",
      });
      if (!user) {
        logger.warn(`User not found: ${userId}`);
        return res.redirect("/web/auth/view/register");
      }

      if (user.isVerified) {
        logger.warn(`Email already verified: ${user.email}`);
        return res.redirect("/web/auth/view/login");
      }

      const otpRecord = await Otp.findOne({
        userId,
        otp,
      });
      if (!otpRecord) {
        logger.warn(`Invalid OTP for ${user.email}`);
        return res.redirect(`/web/auth/view/verify-email/${userId}`);
      }

      user.isVerified = true;
      await user.save();

      await Otp.deleteOne({
        _id: otpRecord._id,
      });

      logger.info(`Email verified successfully: ${user.email}`);

      await activityLogger(req, {
        userId: user._id,
        module: "Auth",
        action: "Verify Email",
        description: `${user.name} verified email successfully`,
      });

      return res.redirect("/web/auth/view/login");
    } catch (error) {
      logger.error(`Verify Email Error: ${error.message}`);

      return res.redirect("/web/auth/view/login");
    }
  }

  viewLogin(req, res) {
    const errors = req.session.errors || {};
    const old = req.session.old || {};

    // Clear after reading
    req.session.errors = null;
    req.session.old = null;

    return res.render("admin/auth/login", {
      errors,
      old,
    });
  }

  async saveLogin(req, res) {
    try {
      const { email, password } = req.body;

      const isPresent = await User.findOne({
        email,
        isDeleted: false,
        status: "active",
      });

      if (!isPresent) {
        req.session.errors = {
          login: "Invalid email or password.",
        };

        req.session.old = {
          email,
        };

        return res.redirect("/web/auth/view/login");
      }

      if (!isPresent.isVerified) {
        logger.warn(`Please verify your email first: ${email}`);
        return res.redirect("/web/auth/view/login");
      }

      const isMatch = await bcrypt.compare(password, isPresent.password);
      if (!isMatch) {
        logger.warn(`Invalid password for ${email}`);

        req.session.errors = {
          login: "Invalid email or password.",
        };

        req.session.old = {
          email,
        };

        return res.redirect("/web/auth/view/login");
      }

      const role = await Role.findById(isPresent.roleId);
      if (!role) {
        logger.warn(`Role not found for ${email}`);
        return res.redirect("/web/auth/view/login");
      }

      // Access Token
      const accessToken = createAccessToken({
        id: isPresent._id,
        name: isPresent.name,
        email: isPresent.email,
        role: role.roleName,
      });

      // Refresh Token
      const refreshToken = createRefreshToken({
        id: isPresent._id,
        name: isPresent.name,
        email: isPresent.email,
        role: role.roleName,
      });

      // Update User
      isPresent.lastLoginAt = new Date();
      isPresent.refreshToken = refreshToken;

      await isPresent.save();

      // Cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Activity Log
      await activityLogger(req, {
        userId: isPresent._id,
        module: "Auth",
        action: "Login",
        description: `${isPresent.name} logged in as ${role.roleName}`,
      });

      logger.info(`${role.roleName} Login : ${isPresent.email}`);

      const redirectMap = {
        Admin: "/web/admin/view/dashboard",
        "Booking Staff": "/web/staff/view/dashboard",
        Customer: "/web/customer/view/dashboard",
        Driver: "/web/driver/view/dashboard",
      };

      return res.redirect(redirectMap[role.roleName] || "/web/auth/view/login");
    } catch (error) {
      logger.error(`Login Error : ${error.message}`);
      return res.redirect("/web/auth/view/login");
    }
  }

  viewForgotPasword(req, res) {
    return res.render("admin/auth/forgot_password");
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const findUser = await User.findOne({
        email,
        isDeleted: false,
        status: "active",
      });

      if (!findUser) {
        logger.warn(`Forgot password requested for unknown email: ${email}`);
        return res.redirect("/web/auth/view/forgot-password");
      }

      logger.info(`Password reset link sent to ${findUser.email}`);

      // Create Secret
      const secret =
        findUser._id +
        process.env.RESET_PASSWORD_SECRET_KEY +
        findUser.password;

      // Generate Token
      const token = jwt.sign(
        {
          id: findUser._id,
        },
        secret,
        {
          expiresIn: "10m",
        },
      );

      // Reset Link
      const resetLink = `${process.env.BASE_URL}/web/auth/view/reset-password/${findUser._id}/${token}`;

      // Send Email
      await sendForgotPasswordEmail({
        to: findUser.email,
        subject: "BusNova Password Reset",
        html: `
        <h3>Hello ${findUser.name},</h3>
        <p>Click the link below to reset your password.</p>
        <a href="${resetLink}">
            Reset Password
        </a>
        <p>This link will expire in 10 minutes.</p>
      `,
      });

      logger.info("Password reset link has been sent to your email.");
      return res.redirect("/web/auth/view/login");
    } catch (error) {
      logger.error(`Forgot Password Error: ${error.message}`);
      return res.redirect("/web/auth/view/forgot-password");
    }
  }
  async viewResetPassword(req, res) {
    try {
      const { id, token } = req.params;

      const findUser = await User.findOne({
        _id: id,
        isDeleted: false,
        status: "active",
      });
      if (!findUser) {
        logger.warn(`Reset password attempted for invalid user ID: ${id}`);
        return res.redirect("/web/auth/view/login");
      }

      const secret =
        findUser._id +
        process.env.RESET_PASSWORD_SECRET_KEY +
        findUser.password;

      jwt.verify(token, secret);

      logger.info(`Password reset page opened for ${findUser.email}`);

      return res.render("admin/auth/reset_password", {
        id,
        token,
      });
    } catch (error) {
      logger.warn(`Invalid or expired reset link: ${error.message}`);
      return res.redirect("/web/auth/view/login");
    }
  }

  async saveResetPassword(req, res) {
    try {
      const { password, confirmPassword } = req.body;
      const { id, token } = req.params;

      if (password !== confirmPassword) {
        logger.warn(
          `Password mismatch while resetting password for user ID: ${id}`,
        );
        return res.redirect(`/web/auth/view/reset-password/${id}/${token}`);
      }

      const findUser = await User.findOne({
        _id: id,
        isDeleted: false,
        status: "active",
      });
      if (!findUser) {
        logger.warn(`Password reset attempted for invalid user ID: ${id}`);
        req.flash("error", "User not found");
        return res.redirect("/web/auth/view/login");
      }

      const secret =
        findUser._id +
        process.env.RESET_PASSWORD_SECRET_KEY +
        findUser.password;

      try {
        jwt.verify(token, secret);
      } catch (error) {
        logger.warn(`Invalid or expired reset token for ${findUser.email}`);
        req.flash("error", "Invalid or expired reset link");
        return res.redirect("/web/auth/view/login");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      findUser.password = hashedPassword;

      // Invalidate any existing login session
      findUser.refreshToken = null;

      await findUser.save();

      await activityLogger(req, {
        userId: user._id,
        module: "Auth",
        action: "Reset Password",
        description: "Password changed successfully",
      });

      logger.info(`Password reset successfully for ${findUser.email}`);

      return res.redirect("/web/auth/view/login");
    } catch (error) {
      logger.error(`Reset Password Error: ${error.message}`);

      return res.redirect("/web/auth/view/login");
    }
  }
}
module.exports = new AuthController();
