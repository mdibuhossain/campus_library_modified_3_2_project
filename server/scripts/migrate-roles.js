// One-off, idempotent migration from the old regular/admin string to DB-driven
// roles. Safe to run repeatedly -- a second run reports no changes.
//
//   cd server && node scripts/migrate-roles.js
//   cd server && node scripts/migrate-roles.js --dry-run
//
// Which account becomes the protected root. Change this if root should be
// someone else -- without a protected holder of user.role.assign, the
// anti-lockout guard has nothing to fall back on.
const ROOT_EMAIL = "admin@cc.com";

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { connectDB } = require("../Config/db");
const User = require("../Models/User_Model");
const Role = require("../Models/Role_Model");
const { SEED_ROLES } = require("../permissions");

const DRY = process.argv.includes("--dry-run");

// old role value -> new role name. "regular" carried no meaning, so derive it
// from designation, which keeps both axes consistent to begin with.
const nextRoleFor = (user) => {
  if (user.role === "admin") return "admin";
  if (user.role && !["regular", "admin"].includes(user.role)) return user.role;
  return user.designation === "teacher" ? "teacher" : "student";
};

const tally = (users) =>
  users.reduce((acc, u) => ((acc[String(u.role)] = (acc[String(u.role)] || 0) + 1), acc), {});

(async () => {
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    console.error("DB not connected -- aborting");
    process.exit(1);
  }
  console.log(DRY ? "\n=== DRY RUN (no writes) ===\n" : "\n=== migrating roles ===\n");

  const before = await User.find({}, "email role designation");
  console.log("BEFORE:", JSON.stringify(tally(before)));

  // 1. upsert the seed roles
  let created = 0, updated = 0;
  for (const seed of SEED_ROLES) {
    const existing = await Role.findOne({ name: seed.name });
    if (!existing) {
      if (!DRY) await new Role(seed).save();
      created++;
      console.log(`  + role "${seed.name}" (${seed.permissions.length} permissions)`);
    } else {
      // keep an existing role's permissions -- they may have been edited from
      // the UI on purpose. Only backfill description/flags if they are unset.
      const patch = {};
      if (!existing.description && seed.description) patch.description = seed.description;
      if (seed.protected && !existing.protected) patch.protected = true;
      if (seed.isDefault && !existing.isDefault) patch.isDefault = true;
      if (Object.keys(patch).length) {
        if (!DRY) await Role.updateOne({ _id: existing._id }, { $set: patch });
        updated++;
        console.log(`  ~ role "${seed.name}" ${JSON.stringify(patch)}`);
      } else {
        console.log(`  = role "${seed.name}" already present`);
      }
    }
  }

  // 2. map every user onto a role name
  let moved = 0;
  for (const user of before) {
    const next = nextRoleFor(user);
    if (next !== user.role) {
      if (!DRY) await User.updateOne({ _id: user._id }, { $set: { role: next } });
      moved++;
      console.log(`  ${user.email}: ${user.role} -> ${next} (designation=${user.designation})`);
    }
  }

  // 3. make sure a protected root exists
  const root = await User.findOne({ email: ROOT_EMAIL });
  if (!root) {
    console.log(`\n  ! ${ROOT_EMAIL} not found -- no protected root was set.`);
    console.log(`    Set ROOT_EMAIL at the top of this script and re-run.`);
  } else if (root.role !== "superadmin") {
    if (!DRY) await User.updateOne({ _id: root._id }, { $set: { role: "superadmin" } });
    console.log(`\n  ${ROOT_EMAIL}: ${root.role} -> superadmin (protected root)`);
  } else {
    console.log(`\n  ${ROOT_EMAIL} is already superadmin`);
  }

  const after = await User.find({}, "email role designation");
  console.log("\nAFTER: ", JSON.stringify(tally(after)));
  console.log(`\nroles created=${created} updated=${updated}, users reassigned=${moved}`);

  if (DRY) {
    console.log(
      "\n(dry run: skipping the invariant and orphan checks -- nothing was" +
        " written, so they would report the pre-migration state)"
    );
    process.exit(0);
  }

  // sanity: the invariant the runtime guard depends on
  const capableRoles = (await Role.find({ permissions: "user.role.assign" })).map((r) => r.name);
  const capableUsers = await User.countDocuments({ role: { $in: capableRoles } });
  console.log(
    `invariant: ${capableUsers} user(s) can assign roles via [${capableRoles.join(", ")}]` +
      (capableUsers ? " -- OK" : "  <-- NOBODY CAN, FIX THIS")
  );

  const orphans = [];
  const names = new Set((await Role.find({}, "name")).map((r) => r.name));
  for (const u of after) if (!names.has(u.role)) orphans.push(`${u.email}(${u.role})`);
  console.log(
    orphans.length
      ? `orphaned role references: ${orphans.join(", ")}  <-- these users have no permissions`
      : "orphaned role references: none -- every user points at a real role"
  );

  process.exit(0);
})().catch((e) => {
  console.error("migration failed:", e.message);
  process.exit(1);
});
