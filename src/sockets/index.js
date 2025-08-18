// src/sockets/index.js
const chatSocket = require("./chat.socket");
const userSocket = require("./user.socket");

module.exports = (io, socket) => {
  chatSocket(io, socket);
  userSocket(io, socket);
};
