const { validationResult } = require("express-validator");

const validateApi = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  next();
};

module.exports = validateApi;
