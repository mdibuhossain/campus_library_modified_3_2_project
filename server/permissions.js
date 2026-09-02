// The permission vocabulary. These KEYS live in code because resolvers name them
// directly; which ROLE holds which key lives in the Role collection and is
// editable at runtime. Adding a capability means adding a key here and checking
// it in a resolver; adding a *role* needs no code change at all.
const PERMISSIONS = {
  "content.create": "Upload books, questions and syllabus",
  "content.edit.any": "Edit content uploaded by anyone (own content is always editable)",
  "content.delete.any": "Delete content uploaded by anyone (own content is always deletable)",
  "content.approve": "Approve or hide submitted content",
  "classroom.create": "Create classrooms",
  "user.list": "View the list of all users",
  "user.role.assign": "Change which role a user has",
  "role.manage": "Create, edit and delete roles",
};

const PERMISSION_KEYS = Object.keys(PERMISSIONS);

const SUPPORT_PERMISSIONS = ["content.approve", "user.role.assign", "role.manage"];

// Seed definitions for the migration script. Roles are data, so these are only
// a starting point -- they can be changed from the role management page after.
const SEED_ROLES = [
  {
    name: "student",
    description: "Browse and upload content, submit classroom work",
    permissions: ["content.create"],
    isDefault: true,
    protected: false,
  },
  {
    name: "teacher",
    description: "Everything a student can do, plus running classrooms",
    permissions: ["content.create", "classroom.create"],
    isDefault: false,
    protected: false,
  },
  {
    name: "moderator",
    description: "Curates the library: approves, edits and removes any content",
    permissions: [
      "content.create",
      "classroom.create",
      "content.approve",
      "content.edit.any",
      "content.delete.any",
    ],
    isDefault: false,
    protected: false,
  },
  {
    name: "admin",
    description: "Moderator, plus managing users and roles",
    permissions: [
      "content.create",
      "classroom.create",
      "content.approve",
      "content.edit.any",
      "content.delete.any",
      "user.list",
      "user.role.assign",
      "role.manage",
    ],
    isDefault: false,
    protected: false,
  },
  {
    name: "superadmin",
    // protected: cannot be edited, deleted, or taken away from its holders.
    // This is the lockout insurance -- without a protected role holding
    // user.role.assign, a bad role edit could leave nobody able to fix it.
    description: "Full access. Cannot be modified or removed.",
    permissions: [...PERMISSION_KEYS],
    isDefault: false,
    protected: true,
  },
];

module.exports = { PERMISSIONS, PERMISSION_KEYS, SEED_ROLES, SUPPORT_PERMISSIONS };
