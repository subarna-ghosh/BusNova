const { Server } = require("socket.io");
const logger = require("../utils/logger");

let io;

const initSocket = (server) => {
  io = new Server(server);

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Admin / Customer / Driver / Staff room
    socket.on("joinRoleRoom", (role) => {
      if (!role) {
        return;
      }

      const room = `role:${role}`;

      socket.join(room);

      logger.info(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};

module.exports = {
  initSocket,
  getIO,
};
