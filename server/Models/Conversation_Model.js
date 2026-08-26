const mongoose = require("mongoose");

/* A 1:1 conversation.
 *
 * `pairKey` is the two participant emails sorted and joined, so the same two
 * people can only ever have one conversation no matter who opens it first --
 * enforced by a unique index rather than by a read-then-write race in the
 * resolver.
 */
const ConversationSchema = new mongoose.Schema({
  pairKey: { type: String, required: true, unique: true, index: true },
  // emails, matching how ownership is tracked everywhere else in this project
  participants: { type: [String], required: true, index: true },
  lastMessage: { type: String, default: "" },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  lastMessageFrom: { type: String, default: "" },
  /* Unread counts, positionally aligned with `participants`.
   *
   * NOT a map keyed by email: MongoDB reads a dot in an update path as nested
   * traversal, so `$inc: {"unread.bob@example.com": 1}` writes
   * unread -> "bob@example" -> "com" instead of one key. Every email contains a
   * dot, so that shape can never work. `participants` is sorted and fixed at two
   * entries, so index 0/1 map to it deterministically. */
  unreadCounts: { type: [Number], default: [0, 0] },
});

// the conversation list query: "mine, newest activity first"
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

ConversationSchema.statics.keyFor = (a, b) =>
  [String(a).toLowerCase(), String(b).toLowerCase()].sort().join("|");

module.exports = mongoose.model("Conversation", ConversationSchema);
