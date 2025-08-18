const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
      role: { type: String, enum: ["USER", "OWNER", "ADMIN"], required: true }
    },
    sender: {
      id: { type: mongoose.Schema.Types.ObjectId },
      role: { type: String, enum: ["USER", "OWNER", "ADMIN"] }
    },
    type: { 
      type: String, 
      enum: ["MESSAGE", "SYSTEM", "ACTION_REQUIRED"],
      required: true 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    relatedEntity: {
      type: { type: String },
      id: { type: mongoose.Schema.Types.ObjectId }
    }
  },
  { timestamps: true }
);

// Index for faster queries
notificationSchema.index({ 'recipient.id': 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
