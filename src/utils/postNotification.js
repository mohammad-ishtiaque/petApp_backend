const AdminNotification = require("../app/module/Notification/AdminNotification");
const Notification = require("../app/module/Notification/Notification");
const catchAsync = require("../utils/catchAsync");

const postNotification = catchAsync(async (title, message, toId = null) => {
  if (!title || !message)
    throw new Error("Missing required fields: title, or message");

  if (!toId) await AdminNotification.create({ title, message });
  else await Notification.create({ toId, title, message });
});

module.exports = postNotification;
