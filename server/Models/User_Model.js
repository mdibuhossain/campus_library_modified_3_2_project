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

module.exports = mongoose.model('User', UserSchema)