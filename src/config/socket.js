// src/config/socket.js
const { Server } = require("socket.io");
const registerSocketHandlers = require("../sockets");
const socketCors = require("./socketCors");

function initSocket(server) {
  const io = new Server(server, {
    cors: socketCors,
    debug: true
  });

  // Register all socket handlers
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);
    registerSocketHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initSocket;
