const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Stop = require("../../models/Stop");
const Route = require("../../models/Route");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class StopController {
  async viewStops(req, res) {
    const findStops = await Stop.find({ isDeleted: false });
    return res.render("admin/dashboard/stop", {
      stops: findStops,
      findAdmin: req.user.name,
    });
  }

  async addStop(req, res) {
    try {
      const { name, city, state, latitude, longitude } = req.body;
      if (!name || !city || !state) {
        logger.warn("Required fields are missing while creating stop.");

        req.session.errors = {
          stop: "Name, City and State are required.",
        };
        return res.redirect("/web/admin/view/stops");
      }

      const isExist = await Stop.findOne({
        name: name.trim(),
        city: city.trim(),
        state: state.trim(),
        isDeleted: false,
      });

      if (isExist) {
        logger.warn(`Stop already exists : ${name}`);

        req.session.errors = {
          stop: "Stop already exists.",
        };
        return res.redirect("/web/admin/view/stops");
      }

      const stop = await Stop.create({
        name: name.trim(),
        city: city.trim(),
        state: state.trim(),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      });

      logger.info(`Stop created : ${stop.name}`);

      await activityLogger(req, {
        userId: req.user.id,
        module: "Stop",
        action: "Create",
        description: `Created stop "${stop.name}"`,
        documentId: stop._id,
      });

      req.session.success = "Stop added successfully.";
      return res.redirect("/web/admin/view/stops");
    } catch (error) {
      logger.error(`Add Stop Error : ${error.message}`);

      req.session.errors = {
        stop: "Something went wrong.",
      };
      return res.redirect("/web/admin/view/stops");
    }
  }

  async updateStop(req, res) {
    try {
      const { id } = req.params;
      const { name, city, state, latitude, longitude } = req.body;

      const stop = await Stop.findById(id);
      if (!stop) {
        logger.warn(`Stop not found : ${id}`);

        req.session.errors = {
          stop: "Stop not found.",
        };
        return res.redirect("/web/admin/view/stops");
      }

      const isExist = await Stop.findOne({
        name: name.trim(),
        city: city.trim(),
        state: state.trim(),
        _id: { $ne: id },
        isDeleted: false,
      });
      if (isExist) {
        logger.warn(`Stop already exists : ${name}`);

        req.session.errors = {
          stop: "Stop already exists.",
        };
        return res.redirect(`/web/admin/view/stops/edit/${id}`);
      }

      stop.name = name.trim();
      stop.city = city.trim();
      stop.state = state.trim();
      stop.latitude = latitude ? parseFloat(latitude) : null;
      stop.longitude = longitude ? parseFloat(longitude) : null;

      await stop.save();

      logger.info(`Stop Updated : ${stop.name}`);

      await activityLogger(req, {
        userId: req.user.id,
        module: "Stop",
        action: "Update",
        description: `Updated Stop "${stop.name}"`,
        documentId: stop._id,
      });

      req.session.success = "Stop updated successfully.";

      return res.redirect("/web/admin/view/stops");
    } catch (error) {
      logger.error(`Update Stop Error : ${error.message}`);

      req.session.errors = {
        stop: "Something went wrong.",
      };
      return res.redirect("/web/admin/view/stops");
    }
  }

  async deleteStop(req, res) {
    try {
      const { id } = req.params;

      const stop = await Stop.findOne({
        _id: id,
        isDeleted: false,
      });
      if (!stop) {
        logger.warn(`Stop not found : ${id}`);

        req.session.errors = {
          stop: "Stop not found.",
        };
        return res.redirect("/web/admin/view/stops");
      }

      stop.isDeleted = true;
      await stop.save();

      logger.info(`Stop Deleted : ${stop.stopName}`);

      await activityLogger(req, {
        userId: req.user.id,
        module: "Stop",
        action: "Delete",
        description: `Deleted Stop "${stop.stopName}"`,
        documentId: stop._id,
      });

      req.session.success = "Stop deleted successfully.";

      return res.redirect("/web/admin/view/stops");
    } catch (error) {
      logger.error(`Delete Stop Error : ${error.message}`);

      req.session.errors = {
        stop: "Something went wrong.",
      };
      return res.redirect("/web/admin/view/stops");
    }
  }
}
module.exports = new StopController();
