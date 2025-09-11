const Notification = require("./Notification");
const asyncHandler = require("../../../utils/asyncHandler");

// Create a new notification
exports.createNotification = async (notificationData) => {
  return await Notification.create(notificationData);
};

// Get user notifications
exports.getUserNotifications = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user;
  const { limit = 20, page = 1 } = req.query;
  const skip = (page - 1) * limit;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ 'recipient.id': userId, 'recipient.role': role })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Notification.countDocuments({ 
      'recipient.id': userId, 
      'recipient.role': role, 
      isRead: false 
    })
  ]);

  res.json({
    success: true,
    data: notifications,
    pagination: {
      total: notifications.length,
      page: parseInt(page),
      limit: parseInt(limit),
      unreadCount
    }
  });
});

// Mark notification as read
exports.markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await Notification.findByIdAndUpdate(
    id,
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  res.json({
    success: true,
    data: notification
  });
});

// Mark all notifications as read
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user;
  
  await Notification.updateMany(
    { 'recipient.id': userId, 'recipient.role': role, isRead: false },
    { $set: { isRead: true } }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// Delete notification
exports.deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { id: userId, role } = req.user;

  const notification = await Notification.findOneAndDelete({
    _id: id,
    'recipient.id': userId,
    'recipient.role': role
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found or access denied'
    });
  }

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
});

// Get notifications with only title, type, message, and time sent
exports.getSimpleNotifications = asyncHandler(async (req, res) => {
  const { id: userId, role } = req.user;

  // Find notifications for the user, select only required fields
  const notifications = await Notification.find(
    { 'recipient.id': userId, 'recipient.role': role, type: { $ne: 'MESSAGE' } },
    { title: 1, type: 1, message: 1, createdAt: 1, _id: 0 }
  ).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: notifications.map(n => ({
      title: n.title,
      type: n.type,
      message: n.message,
      time: n.createdAt
    }))
  });
});
