const admin = require("firebase-admin");
const User = require("./Models/User_Model");
const Notification = require("./Models/Notification_Model");

// FCM error codes meaning "this token is dead, stop using it"
const DEAD_TOKEN_CODES = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
];

/**
 * Notify a set of users: writes the in-app history row, then pushes via FCM.
 *
 * Deliberately AWAITED by callers rather than fired and forgotten. On Vercel the
 * serverless function can be frozen the moment it responds, so a dangling
 * promise would silently never send. It is ~100ms and every failure is
 * swallowed, so awaiting cannot break the mutation that triggered it.
 *
 * @param {string[]} emails  recipients; deduplicated, empty list is a no-op
 * @param {{title:string, body?:string, link?:string, kind?:string}} payload
 */
const notify = async (emails, payload) => {
  try {
    const recipients = [...new Set((emails || []).filter(Boolean))];
    if (!recipients.length) return { stored: 0, pushed: 0 };

    const { title, body = "", link = "/", kind = "content" } = payload || {};
    if (!title) return { stored: 0, pushed: 0 };

    // 1. in-app history -- this is the part that must not be lost, so it happens
    //    first and independently of whether the user ever granted push
    await Notification.insertMany(
      recipients.map((email) => ({ email, title, body, link, kind }))
    );

    // 2. push, to whoever has registered a device
    const users = await User.find(
      { email: { $in: recipients }, fcmTokens: { $exists: true, $ne: [] } },
      "email fcmTokens"
    );
    const tokens = [...new Set(users.flatMap((u) => u.fcmTokens || []))];
    if (!tokens.length) return { stored: recipients.length, pushed: 0 };

    const base = {
      notification: { title, body },
      // the service worker and the foreground handler read these
      data: { link, kind, title, body },
      webpush: {
        fcmOptions: { link },
        notification: { icon: "/assets/images/logo.webp" },
      },
    };

    const messaging = admin.messaging();
    let responses;
    if (typeof messaging.sendEachForMulticast === "function") {
      // firebase-admin v12+ -- one request per token under the hood, batched
      responses = (await messaging.sendEachForMulticast({ tokens, ...base })).responses;
    } else {
      // firebase-admin v11 (this project). Its sendMulticast() posts to FCM's
      // legacy /batch endpoint, which Google has decommissioned -- it now 404s.
      // send() uses the current v1 API and works, so fan out over it ourselves,
      // which is exactly what sendEachForMulticast does internally.
      const settled = await Promise.allSettled(
        tokens.map((token) => messaging.send({ ...base, token }))
      );
      responses = settled.map((r) =>
        r.status === "fulfilled"
          ? { success: true }
          : { success: false, error: { code: r.reason?.errorInfo?.code || r.reason?.code } }
      );
    }

    // 3. prune tokens FCM told us are dead, so the list cannot grow forever
    const dead = responses
      .map((r, i) => (!r.success && DEAD_TOKEN_CODES.includes(r.error?.code) ? tokens[i] : null))
      .filter(Boolean);
    if (dead.length) {
      await User.updateMany(
        { fcmTokens: { $in: dead } },
        { $pull: { fcmTokens: { $in: dead } } }
      );
    }

    return {
      stored: recipients.length,
      pushed: responses.filter((r) => r.success).length,
      failed: responses.filter((r) => !r.success).length,
      pruned: dead.length,
    };
  } catch (err) {
    // A notification must never take down the action that caused it.
    console.error("notify failed:", err.message);
    return { stored: 0, pushed: 0, error: err.message };
  }
};

module.exports = { notify };
