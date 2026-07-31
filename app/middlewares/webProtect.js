const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const webProtect = (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      logger.warn(`Access token missing. Redirecting to refresh token.`);

      res.cookie("redirectAfterRefresh", req.originalUrl, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
      return res.redirect("/web/auth/refresh-token");
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY);
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      logger.warn(
        `Access token expired. Redirecting to refresh token. Route: ${req.originalUrl}`,
      );

      res.cookie("redirectAfterRefresh", req.originalUrl, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
      return res.redirect("/web/auth/refresh-token");
    }

    logger.error(`Protect Middleware Error: ${error.message}`);
    return res.redirect("/web/auth/view/login");
  }
};

module.exports = webProtect;
