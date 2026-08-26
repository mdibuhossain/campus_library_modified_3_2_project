const mongoose = require("mongoose");

// User.role stores the role NAME, not an ObjectId ref -- the name is a natural
// key, the existing user rows already hold role names, and it keeps the
// GET_USER / GET_USERS selection sets working unchanged.
const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  description: { type: String, trim: true },
  permissions: { type: [String], default: [] },
  // a protected role cannot be edited, deleted, or reassigned away from its
  // holders -- this is what stops an admin locking everyone out
  protected: { type: Boolean, default: false },
  // the role handed to a brand-new signup
  isDefault: { type: Boolean, default: false },
});

module.exports = mongoose.model("Role", RoleSchema);
