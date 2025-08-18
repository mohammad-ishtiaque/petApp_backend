// src/sockets/chat.socket.js
const { saveMessage } = require("../app/module/Chat/chat.controller");
const { generateRoomId } = require("../utils/chatHandler");

module.exports = (io, socket) => {
  // Join a room
  socket.on("joinRoom", ({ sender, receiver }) => {
    const roomId = generateRoomId(sender, receiver);
    socket.join(roomId);
  });

  // Send message
  socket.on("sendMessage", async ({ sender, receiver, message }) => {
    const newMsg = await saveMessage(sender, receiver, message);

    const roomId = generateRoomId(sender, receiver);
    io.to(roomId).emit("receiveMessage", newMsg);
  });
};
