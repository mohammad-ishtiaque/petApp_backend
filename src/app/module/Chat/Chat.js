// src/app/module/Chat/chat.model.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ["USER", "OWNER", "ADMIN"], required: true }
  },
  receiver: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ["USER", "OWNER", "ADMIN"], required: true }
  },
  message: { type: String, required: true },
  roomId: { type: String, required: true },  // e.g. "User:123-Owner:456"
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Message", messageSchema);