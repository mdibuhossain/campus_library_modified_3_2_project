const mongoose = require("mongoose");

// In-app notification history. FCM delivers the push, but pushes are fire and
// forget -- this is what backs the bell icon, the unread count, and anything the
// user missed while the browser was closed or permission was denied.
const NotificationSchema = new mongoose.Schema({
  // recipient email, matching how content ownership is tracked elsewhere
  email: { type: String, required: true, index: true },
  title: { type: String, required: true },
  body: { type: String, default: "" },
  // where clicking the notification should take the user
  link: { type: String, default: "/" },
  // coarse grouping so the UI can pick an icon: content | classroom | account
  kind: { type: String, default: "content" },
  read: { type: Boolean, default: false },
  iat: { type: Date, default: Date.now, index: true },
});

// the bell always queries "my newest first"
NotificationSchema.index({ email: 1, iat: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
