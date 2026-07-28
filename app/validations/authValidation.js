const { body } = require("express-validator");

const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .bail()     
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be between 3 and 50 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Enter a valid email")
    .normalizeEmail(),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .bail()
    .isMobilePhone("en-IN")
    .withMessage("Enter a valid phone number"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .bail()
    .isStrongPassword({
      minLength: 8,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Password must contain uppercase, lowercase, number and special character",
    ),
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Enter a valid email"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
];

const forgotPasswordValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Enter a valid email"),
];

const resetPasswordValidation = [
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .bail()
    .isStrongPassword({
      minLength: 8,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage("Password is too weak"),
];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
};



// .bail() --> If this validation fails, stop validating this field and don't run the remaining validations.