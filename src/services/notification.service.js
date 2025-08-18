const Notification = require("../app/module/Notification/Notification");

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  // Send notification to a specific user
  async sendToUser(recipient, notificationData) {
    try {
      // Save notification to database
      const notification = await Notification.create({
        ...notificationData,
        recipient
      });

      // Emit notification to the recipient's room
      const roomId = `${recipient.role}:${recipient.id}`;
      this.io.to(roomId).emit('new_notification', notification);
      
      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, 'recipient.id': userId },
      { isRead: true },
      { new: true }
    );
  }

  // Get user's unread notifications count
  async getUnreadCount(userId, role) {
    return await Notification.countDocuments({
      'recipient.id': userId,
      'recipient.role': role,
      isRead: false
    });
  }
}

module.exports = NotificationService;
