const User = require('../app/module/User/User');
const Owner = require('../app/module/Owner/Owner');

/**
 * Send push notification via OneSignal REST API.
 * 
 * @param {Object} options
 * @param {String|Array<String>} options.userIds - Target MongoDB User/Owner ID(s)
 * @param {String|Array<String>} [options.playerIds] - Target OneSignal Player/Subscription ID(s)
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification body
 * @param {Object} [options.data] - Additional payload data (e.g. { conversationId, senderId, type })
 */
const sendPushNotification = async ({ userIds, playerIds, title, message, data = {} }) => {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    console.warn('⚠️ OneSignal credentials (ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY) are missing in environment variables.');
    return { success: false, reason: 'Credentials missing' };
  }

  const payload = {
    app_id: appId,
    headings: { en: title },
    contents: { en: message },
    data: data,
  };

  const targetUserIds = Array.isArray(userIds)
    ? userIds.map(id => id.toString())
    : userIds
    ? [userIds.toString()]
    : [];

  const targetPlayerIds = Array.isArray(playerIds)
    ? playerIds.map(id => id.toString())
    : playerIds
    ? [playerIds.toString()]
    : [];

  // Also fetch stored playerIds from database for the specified userIds
  if (targetUserIds.length > 0) {
    try {
      const [users, owners] = await Promise.all([
        User.find({ _id: { $in: targetUserIds }, oneSignalPlayerId: { $ne: null } }).select('oneSignalPlayerId'),
        Owner.find({ _id: { $in: targetUserIds }, oneSignalPlayerId: { $ne: null } }).select('oneSignalPlayerId'),
      ]);

      users.forEach(u => u.oneSignalPlayerId && targetPlayerIds.push(u.oneSignalPlayerId));
      owners.forEach(o => o.oneSignalPlayerId && targetPlayerIds.push(o.oneSignalPlayerId));
    } catch (e) {
      console.error('Error fetching oneSignalPlayerId from DB:', e);
    }
  }

  const uniquePlayerIds = [...new Set(targetPlayerIds)];

  if (targetUserIds.length > 0) {
    payload.include_aliases = {
      external_id: targetUserIds
    };
    payload.target_channel = "push";
  }

  if (uniquePlayerIds.length > 0) {
    payload.include_subscription_ids = uniquePlayerIds;
  }

  if (targetUserIds.length === 0 && uniquePlayerIds.length === 0) {
    console.warn('⚠️ No userIds or playerIds provided for OneSignal push notification.');
    return { success: false, reason: 'No recipients' };
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('📣 OneSignal Push Notification Response:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Failed to send OneSignal Push Notification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPushNotification,
};
