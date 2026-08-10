const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const SeatLayout = require("../../models/Seat");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class SeatController {
  viewSeats(req, res) {
    return res.render("admin/dashboard/seats", {
      findAdmin: req.user.name,
    });
  }

  async saveSeatLayout(req, res) {
    try {
      const { name, layoutType, totalRows, seats } = req.body;
      if (!name || !layoutType || !totalRows || !seats) {
        logger.warn("Seat Layout: Required fields missing");

        req.session.errors = {
          layout: "All fields are required.",
        };
        return res.redirect("/web/admin/view/seats");
      }
      // Duplicate Check
      const isExist = await SeatLayout.findOne({
        name,
        isDeleted: false,
      });
      if (isExist) {
        logger.warn(`Seat Layout already exists: ${name}`);

        req.session.errors = {
          layout: "Seat layout already exists.",
        };
        return res.redirect("/web/admin/view/seats");
      }

      const columnCountMap = {
        "2x2": 5,
        "2x1": 4,
        sleeper: 4,
      };

      const totalColumns = columnCountMap[layoutType];
      const parsedSeats = typeof seats === "string" ? JSON.parse(seats) : seats;
      const seatLayout = await SeatLayout.create({
        name,
        layoutType,
        totalRows: Number(totalRows),
        totalColumns,
        seats: parsedSeats,
      });

      logger.info(`Seat Layout Created : ${name}`);

      await activityLogger(req, {
        userId: req.user.id,
        module: "SeatLayout",
        action: "Create",
        description: `Created Seat Layout "${name}"`,
        documentId: seatLayout._id,
      });

      req.session.success = "Seat layout created successfully.";

      return res.redirect("/web/admin/view/seats");
    } catch (error) {
      logger.error(`Save Seat Layout Error : ${error.message}`);

      req.session.errors = {
        layout: "Something went wrong.",
      };

      return res.redirect("/web/admin/view/seats");
    }
  }
}
module.exports = new SeatController();
