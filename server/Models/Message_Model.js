const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
    index: true,
  },
  from: { type: String, required: true },
  body: { type: String, required: true, trim: true, maxlength: 4000 },
  iat: { type: Date, default: Date.now, index: true },
});

/* Paging is by ascending _id after a cursor rather than by skip/limit: a
 * skip-based page shifts under you every time a new message arrives mid-scroll,
 * and it gets slower the further back you read. */
MessageSchema.index({ conversation: 1, _id: 1 });

module.exports = mongoose.model("Message", MessageSchema);
