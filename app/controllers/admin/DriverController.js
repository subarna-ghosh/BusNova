const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs").promises;
const Role = require("../../models/Role");
const User = require("../../models/User");
const SeatLayout = require("../../models/Seat");
const Bus = require("../../models/Bus");
const Route = require("../../models/Route");
const Trip = require("../../models/Trip");
const Driver = require("../../models/DriverProfile");
const AdminNotification = require("../../models/AdminNotification");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");
const sendDriverEmail = require("../../utils/sendDriverEmail");

class DriverController {
  async viewDrivers(req, res) {
    const adminNotifications = await AdminNotification.find({
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    const findBuses = await Bus.find({ isDeleted: false });
    const findDrivers = await Driver.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "buses",
          localField: "assignedBusId",
          foreignField: "_id",
          as: "bus",
        },
      },
      {
        $unwind: {
          path: "$bus",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    return res.render("admin/dashboard/drivers", {
      findBuses,
      drivers: findDrivers,
      findAdmin: req.user.name,
      adminNotifications,
    });
  }

  async createDriver(req, res) {
    try {
      const {
        name,
        email,
        password,
        phone,
        licenseNumber,
        licenseExpiry,
        assignedBusId,
        dutyStatus,
      } = req.body;

      if (
        !name ||
        !email ||
        !password ||
        !phone ||
        !licenseNumber ||
        !licenseExpiry
      ) {
        logger.warn("Driver creation failed. Required fields are missing.");

        req.session.errors = {
          driver: "All required fields must be filled.",
        };

        return res.redirect("/web/admin/view/drivers");
      }

      const existingUser = await User.findOne({
        email,
        isDeleted: false,
      });
      if (existingUser) {
        logger.warn(`Driver creation failed. Email already exists: ${email}`);

        req.session.errors = {
          driver: "Email already exists.",
        };

        return res.redirect("/web/admin/view/drivers");
      }

      const existingLicense = await Driver.findOne({
        licenseNumber,
        isDeleted: false,
      });

      if (existingLicense) {
        logger.warn(
          `Driver creation failed. License already exists: ${licenseNumber}`,
        );

        req.session.errors = {
          driver: "License number already exists.",
        };

        return res.redirect("/web/admin/view/drivers");
      }

      const driverRole = await Role.findOne({
        roleName: "Driver",
        isDeleted: false,
      });
      if (!driverRole) {
        logger.error("Driver role not found.");

        req.session.errors = {
          driver: "Driver role not found.",
        };

        return res.redirect("/web/admin/view/drivers");
      }

      let profileImage = null;
      let profileImagePublicId = null;

      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "driver_images",
        });

        profileImage = result.secure_url;
        profileImagePublicId = result.public_id;

        await fs.unlink(req.file.path);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create User
      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        phone,
        roleId: driverRole._id,
        profileImage,
        profileImagePublicId,
        isVerified: true,
      });

      // Create Driver Profile
      const newDriver = await Driver.create({
        userId: newUser._id,
        licenseNumber,
        licenseExpiry,
        assignedBusId: assignedBusId || null,
        dutyStatus: dutyStatus || "off_duty",
      });

      // Send Credentials
      await sendDriverEmail(newUser, password);

      logger.info(`Driver Created : ${newUser.name}`);

      await activityLogger(req, {
        userId: req.user.id,
        module: "Driver",
        action: "Create",
        description: `Created Driver "${newUser.name}"`,
        documentId: newDriver._id,
      });

      req.session.success = "Driver created successfully.";

      return res.redirect("/web/admin/view/drivers");
    } catch (error) {
      logger.error(`Create Driver Error : ${error.message}`);

      req.session.errors = {
        driver: "Something went wrong.",
      };

      return res.redirect("/web/admin/view/drivers");
    }
  }

  async updateDriver(req, res) {
    try {
      const { id } = req.params;

      const {
        name,
        email,
        phone,
        licenseNumber,
        licenseExpiry,
        assignedBusId,
        dutyStatus,
      } = req.body;

      // Driver Exists
      const driver = await Driver.findById(id);
      if (!driver) {
        logger.warn(`Driver not found : ${id}`);

        req.session.errors = {
          driver: "Driver not found.",
        };

        return res.redirect("/web/admin/view/drivers");
      }

      // User Exists
      const user = await User.findById(driver.userId);
      if (!user) {
        logger.warn(`Associated user not found : ${id}`);

        req.session.errors = {
          driver: "Associated user not found.",
        };

        return res.redirect("/web/admin/view/drivers");
      }

      // Duplicate Email
      const emailExists = await User.findOne({
        email,
        _id: { $ne: user._id },
        isDeleted: false,
      });

      if (emailExists) {
        logger.warn(`Email already exists : ${email}`);

        req.session.errors = {
          driver: "Email already exists.",
        };

        return res.redirect(`/web/admin/view/driver/edit/${id}`);
      }

      // Update Basic User Info
      user.name = name;
      user.email = email;
      user.phone = phone;

      // Upload New Profile Image
      if (req.file) {
        // Delete Old Cloudinary Image
        if (user.profileImagePublicId) {
          await cloudinary.uploader.destroy(user.profileImagePublicId);
        }

        // Upload New Image
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "driver_images",
        });

        // Save New Image Details
        user.profileImage = result.secure_url;
        user.profileImagePublicId = result.public_id;

        // Delete Local Multer File
        await fs.unlink(req.file.path);
      }

      await user.save();

      // Update Driver Details
      driver.licenseNumber = licenseNumber;
      driver.licenseExpiry = licenseExpiry;
      driver.assignedBusId = assignedBusId || null;
      driver.dutyStatus = dutyStatus;

      await driver.save();

      logger.info(`Driver Updated : ${user.name}`);

      await activityLogger(req, {
        userId: req.user.id,
        module: "Driver",
        action: "Update",
        description: `Updated Driver "${user.name}"`,
        documentId: driver._id,
      });

      req.session.success = "Driver updated successfully.";

      return res.redirect("/web/admin/view/drivers");
    } catch (error) {
      logger.error(`Update Driver Error : ${error.message}`);

      req.session.errors = {
        driver: "Something went wrong.",
      };

      return res.redirect("/web/admin/view/drivers");
    }
  }
}
module.exports = new DriverController();
