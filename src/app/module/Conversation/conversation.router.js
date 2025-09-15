const express = require("express");
const { ConversationController } = require("./conversation.controller");
const { authenticateUser } = require("../../middleware/auth.middleware");

const router = express.Router();

const upload = require("../../../utils/upload");
const uploadFields = upload.fields([
  { name: "chatImage", maxCount: 10 },
  { name: "chatVideo", maxCount: 1 },
  { name: "chatVideoCover", maxCount: 1 },
]);

// Error-handling middleware for uploads
const handleMulterError = (err, req, res, next) => {
  if (err) {
    return res.status(400).json({
      error: true,
      message: err.message || "File upload error.",
    });
  }
  next();
};

router.get("/get-conversation", authenticateUser, ConversationController.getConversation)
.get("/get-conversation-list", authenticateUser, ConversationController.getConversationList)
.post("/block-toggle/:conversationId", authenticateUser, ConversationController.blockToggle)
.post("/delete-message/:messageId", authenticateUser, ConversationController.deleteMessage)
.post("/chat-images-video", authenticateUser, uploadFields, handleMulterError, ConversationController.chatImageVideo);


module.exports = router;