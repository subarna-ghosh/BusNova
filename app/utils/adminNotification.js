const AdminNotification = require("../models/AdminNotification");
const socket = require("../config/socket");

const createAdminNotification = async ({
  title,
  message,
  type,
  referenceId = null,
}) => {
  const notification = await AdminNotification.create({
    title,
    message,
    type,
    referenceId,
  });

  // Send real-time notification to online admins
  const io = socket.getIO();

  io.to("role:Admin").emit("newAdminNotification", {
    id: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    type: notification.type,
    referenceId: notification.referenceId,
    createdAt: notification.createdAt,
  });

  return notification;
};

module.exports = createAdminNotification;
