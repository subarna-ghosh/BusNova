const logger = require("../utils/logger");
const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(
        `${req.user.email} (${req.user.role}) attempted to access ${req.originalUrl} without permission.`,
      );
      return res.redirect("/web/auth/view/login");
    }

    return next();
  };
};

module.exports = roleCheck;
