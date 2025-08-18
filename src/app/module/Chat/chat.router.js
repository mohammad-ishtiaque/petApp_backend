// src/app/module/Chat/chat.router.js
const express = require("express");
const { 
  getMessages, 
  saveMessage, 
  getConversations, 
  markAsRead 
} = require("./chat.controller");
const { authenticateOwnerAndUser } = require("../../middleware/auth.middleware");

const router = express.Router();

// Protect all routes with authentication
router.use(authenticateOwnerAndUser);

// Get messages for a specific chat room
router.get("/messages/:roomId", getMessages);

// Get user's conversations
router.get("/conversations", getConversations);

// Mark messages as read in a conversation
router.put("/:roomId/read", markAsRead);

// Send a new message (handled via WebSocket, but keeping REST endpoint for compatibility)
router.post("/", async (req, res, next) => {
  try {
    const { receiver, message } = req.body;
    const sender = {
      id: req.user.id,
      role: req.user.role
    };
    
    const newMessage = await saveMessage(sender, receiver, message);
    res.status(201).json(newMessage);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
