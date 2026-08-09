const { body } = require("express-validator");

const bookingValidation = [
  body("tripId").notEmpty().withMessage("Trip is required."),

  body("seats").notEmpty().withMessage("Please select at least one seat."),

  body("contactEmail")
    .isEmail()
    .withMessage("Please enter a valid email address."),

  body("contactPhone").notEmpty().withMessage("Phone number is required."),

  body("boardingPoint").notEmpty().withMessage("Boarding point is required."),

  body("dropoffPoint").notEmpty().withMessage("Drop-off point is required."),

  body("totalAmount")
    .notEmpty()
    .withMessage("Total amount is required.")
    .isNumeric()
    .withMessage("Invalid amount."),
];

const updateProfileValidation = [
  body("name")
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone("en-IN")
    .withMessage("Please enter a valid phone number"),

  body("email")
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
];
module.exports = {
  bookingValidation,
  updateProfileValidation,
};
