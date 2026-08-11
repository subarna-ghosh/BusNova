const mongoose = require("mongoose");
const Notification = require("../../models/Notification");
const AdminNotification = require("../../models/AdminNotification");
const User = require("../../models/User");
const Role = require("../../models/Role");
const socket = require("../../config/socket");
const logger = require("../../utils/logger");

class NotificationController {
  async viewNotification(req, res) {
    try {
      const adminNotifications = await AdminNotification.find({
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      const listUsers = await User.aggregate([
        {
          $lookup: {
            from: "roles",
            localField: "roleId",
            foreignField: "_id",
            as: "role",
          },
        },
        {
          $unwind: "$role",
        },
        {
          $match: {
            "role.roleName": {
              $in: ["Customer", "Driver", "Staff"],
            },
            isDeleted: false,
            status: "active",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            roleName: "$role.roleName",
          },
        },
        {
          $sort: {
            name: 1,
          },
        },
      ]);

      const notifications = await Notification.find({
        isDeleted: false,
        status: "sent",
      })
        .sort({ sentAt: -1 })
        .limit(10)
        .lean();

      return res.render("admin/dashboard/notifications", {
        findAdmin: req.user.name,
        notifications,
        listUsers,
        adminNotifications,
      });
    } catch (error) {
      logger.error(`View notification error: ${error.message}`);

      return res.render("admin/dashboard/notifications", {
        findAdmin: req.user.name,
        notifications: [],
        listUsers: [],
        adminNotifications,
      });
    }
  }

  async createNotification(req, res) {
    try {
      const { title, message, audience, userId } = req.body;

      if (!title?.trim() || !message?.trim() || !audience) {
        logger.warn("Invalid notification data");

        return res.redirect("/web/admin/view/notifications");
      }

      // Specific user validation
      if (audience === "specific_user") {
        if (!userId) {
          logger.warn("Specific user not selected");

          return res.redirect("/web/admin/view/notifications");
        }

        const findUser = await User.findOne({
          _id: userId,
          isDeleted: false,
          status: "active",
        });

        if (!findUser) {
          logger.warn(`User not found: ${userId}`);

          return res.redirect("/web/admin/view/notifications");
        }
      }

      // Save notification
      const notification = await Notification.create({
        title: title.trim(),
        message: message.trim(),
        audience,
        userId: audience === "specific_user" ? userId : null,
        sentBy: req.user.id,
        sentAt: new Date(),
        status: "sent",
      });

      // Get Socket.IO
      const io = socket.getIO();

      // Data to send to browser
      const notificationData = {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        audience: notification.audience,
        sentAt: notification.sentAt,
      };

      // For now: send to EVERY connected browser
      io.emit("newNotification", notificationData);

      logger.info(`Notification sent through socket: ${notification._id}`);

      return res.redirect("/web/admin/view/notifications");
    } catch (error) {
      logger.error(`Create notification error: ${error.message}`);

      return res.redirect("/web/admin/view/notifications");
    }
  }
}

module.exports = new NotificationController();
