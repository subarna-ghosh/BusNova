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

module.exports = {
  bookingValidation,
};
