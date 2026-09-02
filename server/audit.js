const AuditLog = require("./Models/AuditLog_Model");

/**
 * Record one change. Never throws.
 *
 * Deliberately fire-and-forget: an audit write must not be able to fail the
 * mutation it is describing. Losing a history row is bad; refusing a user's
 * upload because the history collection hiccuped is worse. Failures are logged
 * so they are at least visible in the server output.
 */
const recordAudit = ({
  actor,
  action,
  targetType = "",
  targetId = "",
  targetLabel = "",
  subject = "",
  meta = {},
}) => {
  if (!actor || !action) return;
  AuditLog.create({
    actor,
    action,
    targetType,
    targetId: targetId ? String(targetId) : "",
    targetLabel,
    subject,
    meta,
  }).catch((e) => console.log("audit write failed:", action, e?.message));
};

/* Which fields an edit actually changed. An audit row saying "edited" is nearly
 * useless; "edited (author, edition)" is reviewable at a glance. Compared
 * loosely (String()) because form values arrive as strings while the stored
 * value may be a number or an array. */
const changedFields = (before, after) => {
  const fields = [];
  for (const key of Object.keys(after || {})) {
    if (after[key] === undefined) continue;
    const a = before?.[key];
    const b = after[key];
    const same = Array.isArray(a) || Array.isArray(b)
      ? String(a || "") === String(b || "")
      : String(a ?? "") === String(b ?? "");
    if (!same) fields.push(key);
  }
  return fields;
};

module.exports = { recordAudit, changedFields };
