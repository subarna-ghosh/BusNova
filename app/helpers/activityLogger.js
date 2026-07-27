const ActivityLog = require("../models/Activitylog");

const activityLogger = async (req, { userId, module, action, description }) => {
  try {
    await ActivityLog.create({
      userId,
      module,
      action,
      description,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (err) {
    console.error("Activity Log Error:", err.message);
  }
};

module.exports = activityLogger;
