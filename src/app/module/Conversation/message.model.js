const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    video: {
      type: String,
      default: null,
    },
    videoCover: {
      type: String,
      default: null,
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "messages",
  }
);

messageSchema.index({ conversationId: 1 });

// Use a distinct model name to avoid collision with Chat/Message model
const ConversationMessage = mongoose.models.ConversationMessage || model("ConversationMessage", messageSchema);
module.exports = ConversationMessage;

