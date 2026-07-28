const ActivityLog = require("../models/Activitylog");
const logger = require("../utils/logger");

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
  } catch (error) {
    logger.error("Activity Log Error:", error.message);
  }
};

module.exports = activityLogger;
