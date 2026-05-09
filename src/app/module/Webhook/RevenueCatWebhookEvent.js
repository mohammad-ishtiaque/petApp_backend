const mongoose = require('mongoose');

const revenueCatWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    eventType: {
      type: String
    },
    appUserId: {
      type: String
    },
    processedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

module.exports = mongoose.model('RevenueCatWebhookEvent', revenueCatWebhookEventSchema);
