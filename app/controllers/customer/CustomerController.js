const mongoose = require("mongoose");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs").promises;
const Role = require("../../models/Role");
const User = require("../../models/User");
const Booking = require("../../models/Booking");
const Notification = require("../../models/Notification");
const Trip = require("../../models/Trip");
const Route = require("../../models/Route");
const Stop = require("../../models/Stop");
const Payment = require("../../models/Payment");
const Passenger = require("../../models/Passenger");
const sendEmail = require("../../utils/sendEmail");
const logger = require("../../utils/logger");
const {
  createAccessToken,
  createRefreshToken,
} = require("../../utils/createToken");
const activityLogger = require("../../helpers/activityLogger");

class CustomerController {
  async viewCustomerDashboard(req, res) {
    try {
      const userId = req.user.id;

      if (!userId) {
        logger.warn("User ID missing from JWT payload");
        return res.redirect("/web/auth/view/login");
      }

      // -----------------------------------------
      // FIND USER
      // -----------------------------------------

      const findUser = await User.findOne({
        _id: userId,
        status: "active",
        isDeleted: false,
      });

      if (!findUser) {
        logger.warn(`User not found: ${userId}`);
        return res.redirect("/web/auth/view/login");
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);

      const now = new Date();

      // -----------------------------------------
      // 1. TOTAL TRIPS
      // -----------------------------------------
      // Confirmed + completed bookings
      // Cancelled bookings are not counted.
      // -----------------------------------------

      const totalTrips = await Booking.countDocuments({
        userId: userObjectId,
        bookingStatus: {
          $in: ["confirmed", "completed"],
        },
        isDeleted: false,
      });

      // -----------------------------------------
      // 2. UPCOMING TRIPS
      // -----------------------------------------

      const upcomingTrips = await Booking.aggregate([
        {
          $match: {
            userId: userObjectId,

            bookingStatus: "confirmed",

            isDeleted: false,
          },
        },

        // Booking → Trip
        {
          $lookup: {
            from: "trips",
            localField: "tripId",
            foreignField: "_id",
            as: "trip",
          },
        },

        {
          $unwind: "$trip",
        },

        // Only trips which haven't departed
        {
          $match: {
            "trip.departureAt": {
              $gt: now,
            },

            "trip.status": {
              $nin: ["cancelled", "completed", "departed"],
            },
          },
        },

        {
          $count: "total",
        },
      ]);

      const upcomingTripCount =
        upcomingTrips.length > 0 ? upcomingTrips[0].total : 0;

      // -----------------------------------------
      // 3. FAVORITE ROUTES
      // -----------------------------------------
      //
      // We calculate this from booking history.
      // Each unique route booked by the customer
      // is considered a favorite route.
      // -----------------------------------------

      const favoriteRoutes = await Booking.aggregate([
        {
          $match: {
            userId: userObjectId,

            bookingStatus: {
              $in: ["confirmed", "completed"],
            },

            isDeleted: false,
          },
        },

        // Booking → Trip
        {
          $lookup: {
            from: "trips",
            localField: "tripId",
            foreignField: "_id",
            as: "trip",
          },
        },

        {
          $unwind: "$trip",
        },

        // Group by route
        {
          $group: {
            _id: "$trip.routeId",
          },
        },

        // Count unique routes
        {
          $count: "total",
        },
      ]);

      const favoriteRouteCount =
        favoriteRoutes.length > 0 ? favoriteRoutes[0].total : 0;

      // -----------------------------------------
      // 4. TOTAL SEATS BOOKED
      // -----------------------------------------

      const totalSeatsBooked = await Booking.aggregate([
        {
          $match: {
            userId: userObjectId,

            bookingStatus: {
              $in: ["confirmed", "completed"],
            },

            isDeleted: false,
          },
        },

        {
          $project: {
            seatCount: {
              $cond: [
                {
                  $isArray: "$seatNumbers",
                },
                {
                  $size: "$seatNumbers",
                },
                0,
              ],
            },
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: "$seatCount",
            },
          },
        },
      ]);

      const seatsBooked =
        totalSeatsBooked.length > 0 ? totalSeatsBooked[0].total : 0;

      // save notification
      const notifications = await Notification.find({
        isDeleted: false,
        status: "sent",
        $or: [
          { audience: "all" },
          { audience: "Customer" },
          { audience: "specific_user", userId: userId },
        ],
      })
        .sort({ sentAt: -1 })
        .limit(10)
        .lean();

      // -----------------------------------------
      // RENDER DASHBOARD
      // -----------------------------------------

      return res.render("customer/customer_dashboard", {
        findUser,
        totalTrips,
        upcomingTripCount,
        favoriteRouteCount,
        seatsBooked,
        username: findUser.name,
        currentUserId: req.user.id,
        notifications,
      });
    } catch (error) {
      logger.error(`Customer Dashboard Error: ${error.message}`);

      return res.redirect("/web/auth/view/login");
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { name, email, phone } = req.body;

      const user = await User.findOne({
        _id: userId,
        isDeleted: false,
      });

      if (!user) {
        logger.warn(`Profile update failed. User not found: ${userId}`);

        req.session.errors = {
          profile: "User not found.",
        };

        return res.redirect("/web/customer/view/dashboard");
      }

      // -----------------------------------------
      // Check duplicate email
      // -----------------------------------------

      const existingUser = await User.findOne({
        email: email.trim(),
        _id: { $ne: userId },
        isDeleted: false,
      });

      if (existingUser) {
        logger.warn(`Profile update failed. Email already exists: ${email}`);

        req.session.errors = {
          profile: "Email already exists.",
        };

        return res.redirect("/web/customer/view/dashboard");
      }

      // -----------------------------------------
      // Update basic information
      // -----------------------------------------

      user.name = name.trim();
      user.email = email.trim();
      user.phone = phone.trim();

      // -----------------------------------------
      // Update profile image
      // -----------------------------------------

      if (req.file) {
        // Delete old Cloudinary image
        if (user.profileImagePublicId) {
          await cloudinary.uploader.destroy(user.profileImagePublicId);
        }

        // Upload new image
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "busnova-user-profile",
        });

        user.profileImage = result.secure_url;
        user.profileImagePublicId = result.public_id;

        // Delete temporary file
        await fs.unlink(req.file.path);
      }

      // -----------------------------------------
      // Save user
      // -----------------------------------------

      await user.save();

      logger.info(`Customer profile updated: ${user.email}`);

      // -----------------------------------------
      // Activity log
      // -----------------------------------------

      await activityLogger(req, {
        userId: req.user.id,
        module: "Customer",
        action: "Update",
        description: `Updated Customer Profile "${user.name}"`,
        documentId: user._id,
      });

      // -----------------------------------------
      // Success message
      // -----------------------------------------

      req.session.success = "Profile updated successfully.";

      return res.redirect("/web/customer/view/dashboard");
    } catch (error) {
      logger.error(`Customer Profile Update Error: ${error.message}`);

      req.session.errors = {
        profile: "Something went wrong while updating your profile.",
      };

      return res.redirect("/web/customer/view/dashboard");
    }
  }
}
module.exports = new CustomerController();
