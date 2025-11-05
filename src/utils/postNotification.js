const AdminNotification = require("../app/module/Notification/AdminNotification");
const Notification = require("../app/module/Notification/Notification");
const User = require("../app/module/User/User");
const Owner = require("../app/module/Owner/Owner");
const Admin = require("../app/module/Admin/Admin");

// Helper to infer recipient role by ID
async function inferRoleById(id) {
  try {
    if (!id) return null;
    const admin = await Admin.findById(id).select("_id role").lean();
    if (admin) return "ADMIN";
    const owner = await Owner.findById(id).select("_id").lean();
    if (owner) return "OWNER";
    const user = await User.findById(id).select("_id").lean();
    if (user) return "USER";
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Post a notification to a recipient or to admins if no recipient is provided.
 *
 * @param {string} title - Notification title (required)
 * @param {string} message - Notification message (required)
 * @param {string|null} toId - Recipient id (User/Owner/Admin). If null, creates AdminNotification
 * @param {object} extras - Optional fields
 * @param {('USER'|'OWNER'|'ADMIN')} [extras.role] - Explicit recipient role (skips inference)
 * @param {{id:string, role:'USER'|'OWNER'|'ADMIN'}} [extras.sender] - Sender info
 * @param {('MESSAGE'|'SYSTEM'|'ACTION_REQUIRED')} [extras.type] - Notification type (default SYSTEM)
 * @param {object} [extras.data] - Arbitrary payload
 * @param {{type:string, id:string}} [extras.relatedEntity] - Related entity reference
 */
async function postNotification(title, message, toId = null, extras = {}) {
  try {
    if (!title || !message) {
      throw new Error("Missing required fields: title or message");
    }

    // If no recipient provided, store as admin notification
    if (!toId) {
      await AdminNotification.create({ title, message });
      return;
    }

    const { role: explicitRole, sender, type = "SYSTEM", data, relatedEntity } = extras || {};
    const role = explicitRole || (await inferRoleById(toId)) || "USER";

    await Notification.create({
      recipient: { id: toId, role },
      sender: sender || undefined,
      type,
      title,
      message,
      data,
      relatedEntity,
    });
  } catch (err) {
    // Avoid crashing the caller on notification failures
    console.error("postNotification failed:", err?.message || err);
  }
}

module.exports = postNotification;
