const mongoose = require("mongoose");

/* What changed, who changed it, and when.
 *
 * This collection exists because nothing else recorded it. No other schema in
 * this project carries timestamps, and none kept revisions, so before this there
 * was no way to answer "who edited that book" or "when did this person become a
 * moderator" -- the answer was simply not stored anywhere. Creation times can be
 * recovered from an ObjectId, but an edit leaves no trace in the document.
 *
 * Consequence worth being clear about: this is not retroactive. It starts
 * describing the system from the moment it is deployed.
 *
 * Two identities per row, because a superadmin looks at history from both
 * directions:
 *   actor   -- who performed the action ("what has this user been doing")
 *   subject -- whose account the action was about, when that differs from the
 *              actor ("what has been done to this user"), e.g. a role change
 */
const AuditLogSchema = new mongoose.Schema({
  actor: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  targetType: { type: String, default: "" },
  targetId: { type: String, default: "" },
  // denormalised on purpose: the target may later be deleted, and "edited
  // <deleted document>" is useless in a history view
  targetLabel: { type: String, default: "" },
  subject: { type: String, default: "", index: true },
  // free-form per action, e.g. { from: "student", to: "moderator" } or the
  // list of fields an edit touched
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  iat: { type: Date, default: Date.now, index: true },
});

// the two access patterns: one user's activity, newest first
AuditLogSchema.index({ actor: 1, iat: -1 });
AuditLogSchema.index({ subject: 1, iat: -1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
