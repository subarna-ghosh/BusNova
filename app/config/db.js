require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const db = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URL);
    if (connection) {
      logger.info("Database connected");
    } else {
      logger.error("Database not connected");
    }
  } catch (error) {
    logger.error("Error connecting to database:", error);
  }
};

module.exports = db;
