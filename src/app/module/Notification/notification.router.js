const express = require("express");
const router = express.Router();
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getSimpleNotifications,
  getAdminNotifications
} = require("./notification.controller");
const { authenticateOwnerAndUser, authenticateAdminOrSuperAdmin } = require("../../middleware/auth.middleware");

// Protect all routes with authentication
// router.use(authenticateOwnerAndUser);

// Get user notifications
router.get("/",authenticateOwnerAndUser, getUserNotifications);

// Mark notification as read
router.put("/:id/read", authenticateOwnerAndUser, markAsRead);

// Mark all notifications as read
router.put("/read-all", markAllAsRead);

// Delete notification
router.delete("/:id", deleteNotification);

// Get notifications with only title, type, message, and time sent
router.get("/simple", authenticateOwnerAndUser, getSimpleNotifications);

// Get admin notifications
router.get("/admin-notifications", authenticateAdminOrSuperAdmin, getAdminNotifications);

module.exports = router;
