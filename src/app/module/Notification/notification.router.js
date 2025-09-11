const express = require("express");
const router = express.Router();
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getSimpleNotifications
} = require("./notification.controller");
const { authenticateOwnerAndUser } = require("../../middleware/auth.middleware");

// Protect all routes with authentication
router.use(authenticateOwnerAndUser);

// Get user notifications
router.get("/", getUserNotifications);

// Mark notification as read
router.put("/:id/read", markAsRead);

// Mark all notifications as read
router.put("/read-all", markAllAsRead);

// Delete notification
router.delete("/:id", deleteNotification);

// Get notifications with only title, type, message, and time sent
router.get("/simple", getSimpleNotifications);

module.exports = router;
