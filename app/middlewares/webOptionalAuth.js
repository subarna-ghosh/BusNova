const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const webOptionalAuth = (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    // No token = guest
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY);

    req.user = decoded;

    return next();
  } catch (error) {
    // Invalid/expired token should simply be treated as guest
    logger.warn(`Optional authentication failed: ${error.message}`);

    req.user = null;

    return next();
  }
};

module.exports = webOptionalAuth;
