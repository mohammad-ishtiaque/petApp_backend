const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const conversationSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    messages: [
      {
        type: Schema.Types.ObjectId,
        ref: "ConversationMessage",
        default: [],
      },
    ],
    blockedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    collection: "conversation",
  }
);

conversationSchema.index({ participants: 1});

const Conversation = mongoose.models.Conversation || model("Conversation", conversationSchema);
module.exports = Conversation;
