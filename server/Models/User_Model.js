const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    displayName: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    photoURL: { type: String },
    authType: { type: String },
    designation: { type: String },
    department: { type: String },
    semester: { type: String },
    role: { type: String },
    // FCM device tokens. An array because one person may use several browsers
    // or devices; invalid ones are pruned when FCM reports them as stale.
    fcmTokens: { type: [String], default: [] }
})

// Backs searchUsers(): a case-insensitive prefix/substring match on either
// field. Without these, every search is a full collection scan.
UserSchema.index({ displayName: 1 })
UserSchema.index({ email: 1 })

module.exports = mongoose.model('User', UserSchema)