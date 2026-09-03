const Notification = require("../app/module/Notification/Notification");
const { sendPushNotification } = require("./onesignal.service");

class NotificationService {
  constructor(io, options = {}) {
    this.io = io;
    const envToggle =
      typeof process !== 'undefined' && process.env.NOTIFICATIONS_REALTIME;
    const enableRealtimeFromEnv =
      envToggle === undefined ? undefined : envToggle === 'true';
    this.enableRealtime =
      options.enableRealtime !== undefined
        ? options.enableRealtime
        : enableRealtimeFromEnv !== undefined
        ? enableRealtimeFromEnv
        : true; // default real-time on unless disabled
  }

  // Send notification to a specific user
  async sendToUser(recipient, notificationData) {
    try {
      // Save notification to database
      const notification = await Notification.create({
        ...notificationData,
        recipient
      });

      // Emit notification to the recipient's room (if enabled)
      if (this.enableRealtime && this.io) {
        const roomId = `${recipient.role}:${recipient.id}`;
        this.io.to(roomId).emit('new_notification', notification);
      }

      // Also trigger OneSignal push notification
      sendPushNotification({
        userIds: [recipient.id],
        title: notificationData.title || "New Notification",
        message: notificationData.message || "You have a new update",
        data: {
          type: notificationData.type || "SYSTEM",
          notificationId: notification._id.toString(),
          ...(notificationData.data || {})
        }
      }).catch(err => console.error("Error sending push notification from service:", err));
      
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
