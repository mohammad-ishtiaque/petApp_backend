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
      {
        type: Schema.Types.ObjectId,
        ref: "Owner",
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
      {
        type: Schema.Types.ObjectId,
        ref: "Owner"
      }
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
