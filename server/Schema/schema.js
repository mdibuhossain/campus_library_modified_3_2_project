const {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLSchema,
  GraphQLList,
  GraphQLNonNull,
} = require("graphql");
const { GraphQLUpload } = require("graphql-upload");
const fs = require("fs");
const path = require("path");
const Book = require("../Models/Book_Model");
const User = require("../Models/User_Model");
const Question = require("../Models/Question_Model");
const Syllabus = require("../Models/Syllabus_Model");
const Room = require("../Models/Room_Model");
const Task = require("../Models/Task_Model");
const Submission = require("../Models/Submission_Model");
const Role = require("../Models/Role_Model");
const Notification = require("../Models/Notification_Model");
const { notify } = require("../notifications");
const { PERMISSION_KEYS } = require("../permissions");
const { verifyToken } = require("../MiddleWare/isAuth");
const admin = require("firebase-admin");

const ASSIGNMENTS_DIR = path.join(__dirname, "..", "public", "assignments");

// Mongoose gives us Date objects. Everything in this schema is a GraphQLString,
// and the client does `new Date(task.deadline)` -- so emit ISO strings, the same
// thing res.json() used to produce. Letting GraphQL coerce a Date via String()
// would yield "Mon Aug 24 2026 ..." instead.
const isoDate = (field) => ({
  type: GraphQLString,
  resolve: (parent) => {
    const value = parent?.[field];
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : String(value);
  },
});

const requireUser = async (token) => {
  const decodedEmail = await verifyToken(token);
  if (!decodedEmail) {
    throw new Error("Unauthenticated!");
  }
  const caller = await User.findOne({ email: decodedEmail });
  if (!caller) {
    throw new Error("User not exist!");
  }
  return caller;
};

// Role name -> permissions[], memoised so a permission check does not cost an
// extra query on every resolver. MUST be invalidated by every role write, or a
// permission change silently does nothing until the process restarts.
let rolesCache = null;

const loadRoles = async () => {
  if (rolesCache) return rolesCache;
  const roles = await Role.find({});
  rolesCache = new Map(roles.map((r) => [r.name, r]));
  return rolesCache;
};

const invalidateRolesCache = () => {
  rolesCache = null;
};

const permissionsOf = async (roleName) => {
  if (!roleName) return [];
  const roles = await loadRoles();
  return roles.get(roleName)?.permissions || [];
};

const can = async (user, key) =>
  (await permissionsOf(user?.role)).includes(key);

// requireUser + a capability check. Throws the same "Unauthorized" string the
// old role checks threw, so existing client-side alerts read identically.
const requirePermission = async (token, key) => {
  const caller = await requireUser(token);
  if (!(await can(caller, key))) {
    throw new Error("Unauthorized");
  }
  return caller;
};

// "own content, or the permission to touch anyone's" -- ownership itself needs
// no permission key, it is just a comparison against added_by
const requireOwnerOr = async (token, doc, key) => {
  const caller = await requireUser(token);
  if (doc?.added_by && doc.added_by === caller.email) return caller;
  if (await can(caller, key)) return caller;
  throw new Error("Unauthorized");
};

// Anti-lockout invariant: at least one existing user must hold a role that
// grants user.role.assign, otherwise nobody can ever fix a bad role change.
const someoneCanAssignRoles = async () => {
  const roles = await loadRoles();
  const capable = [...roles.values()]
    .filter((r) => r.permissions.includes("user.role.assign"))
    .map((r) => r.name);
  if (!capable.length) return false;
  return (await User.countDocuments({ role: { $in: capable } })) > 0;
};

// everyone whose role grants content.approve -- the review queue audience
const notifyReviewers = async (doc, kind) => {
  const roles = await loadRoles();
  const approverRoles = [...roles.values()]
    .filter((r) => r.permissions.includes("content.approve"))
    .map((r) => r.name);
  if (!approverRoles.length) return;
  const reviewers = await User.find({ role: { $in: approverRoles } }, "email");
  await notify(
    reviewers.map((r) => r.email).filter((e) => e !== doc?.added_by),
    {
      title: "New content awaiting review",
      body: `${doc?.book_name} (${kind}) from ${doc?.added_by}`,
      link: "/pending",
      kind: "content",
    }
  );
};

const defaultRoleName = async () => {
  const roles = await loadRoles();
  for (const role of roles.values()) if (role.isDefault) return role.name;
  return "student";
};

// members + admin, as the REST controllers populated them
const ROOM_PEOPLE_POPULATE = [
  {
    path: "members",
    select: "displayName email designation department photoURL -_id",
  },
  {
    path: "admin",
    select: "displayName email photoURL -_id",
  },
];

const DESIGNATIONS = ["teacher", "student"];
const isProfileComplete = (user) =>
  !!(
    user &&
    DESIGNATIONS.includes(user.designation) &&
    user.department &&
    (user.designation !== "student" || user.semester)
  );

// GraphQL Schema template
const GraphQLSchemaTemplate = {
  _id: { type: GraphQLID },
  book_name: { type: GraphQLString },
  download_link: { type: GraphQLString },
  categories: { type: GraphQLString },
  sub_categories: { type: GraphQLString },
  added_by: { type: GraphQLString },
  status: { type: GraphQLBoolean },
};
const GraphQLSchemaTemplateForBook = {
  ...GraphQLSchemaTemplate,
  author: { type: GraphQLString },
  edition: { type: GraphQLString },
  semester: { type: new GraphQLList(GraphQLString) },
  course_code: { type: GraphQLString },
};
const GraphQLSchemaForUser = {
  _id: { type: GraphQLID },
  displayName: { type: GraphQLString },
  email: { type: GraphQLString },
  password: { type: GraphQLString },
  photoURL: { type: GraphQLString },
  authType: { type: GraphQLString },
  designation: { type: GraphQLString },
  department: { type: GraphQLString },
  semester: { type: GraphQLString },
  role: { type: GraphQLString },
};
const GraphQLSchemaAuth = {
  _id: { type: GraphQLID },
  token: { type: GraphQLString },
};

// GraphQL Schema
const BookType = new GraphQLObjectType({
  name: "book",
  fields: () => ({
    ...GraphQLSchemaTemplateForBook,
  }),
});
const QuestionType = new GraphQLObjectType({
  name: "question",
  fields: () => ({
    ...GraphQLSchemaTemplate,
  }),
});
const SyllabusType = new GraphQLObjectType({
  name: "syllabus",
  fields: () => ({
    ...GraphQLSchemaTemplate,
  }),
});
const UserType = new GraphQLObjectType({
  name: "user",
  fields: () => ({
    ...GraphQLSchemaForUser,
  }),
});
const UserStatus = new GraphQLObjectType({
  name: "getUserStatus",
  fields: () => ({
    isAdmin: { type: GraphQLBoolean },
    designation: { type: GraphQLString },
    department: { type: GraphQLString },
    semester: { type: GraphQLString },
    isProfileComplete: { type: GraphQLBoolean },
    role: { type: GraphQLString },
    permissions: { type: new GraphQLList(GraphQLString) },
  }),
});
const DepartmentType = new GraphQLObjectType({
  name: "deparment",
  fields: () => ({
    dept_name: { type: GraphQLString },
  }),
});
const AuthActionType = new GraphQLObjectType({
  name: "authAction",
  fields: () => ({
    success: { type: GraphQLBoolean },
    message: { type: GraphQLString },
  }),
});
const RoleType = new GraphQLObjectType({
  name: "role",
  fields: () => ({
    _id: { type: GraphQLID },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    permissions: { type: new GraphQLList(GraphQLString) },
    protected: { type: GraphQLBoolean },
    isDefault: { type: GraphQLBoolean },
    userCount: { type: GraphQLInt },
  }),
});
const NotificationType = new GraphQLObjectType({
  name: "notification",
  fields: () => ({
    _id: { type: GraphQLID },
    title: { type: GraphQLString },
    body: { type: GraphQLString },
    link: { type: GraphQLString },
    kind: { type: GraphQLString },
    read: { type: GraphQLBoolean },
    iat: isoDate("iat"),
  }),
});
const NotificationFeedType = new GraphQLObjectType({
  name: "notificationFeed",
  fields: () => ({
    items: { type: new GraphQLList(NotificationType) },
    unread: { type: GraphQLInt },
  }),
});
const PermissionKeyType = new GraphQLObjectType({
  name: "permissionKey",
  fields: () => ({
    key: { type: GraphQLString },
    description: { type: GraphQLString },
  }),
});

const SubmissionType = new GraphQLObjectType({
  name: "submission",
  fields: () => ({
    _id: { type: GraphQLID },
    user: { type: UserType },
    task: { type: GraphQLID },
    fileId: { type: GraphQLString },
    originalFilename: { type: GraphQLString },
    submittedAt: isoDate("submittedAt"),
  }),
});
const TaskType = new GraphQLObjectType({
  name: "task",
  fields: () => ({
    _id: { type: GraphQLID },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    deadline: isoDate("deadline"),
    room: { type: GraphQLID },
    author: { type: GraphQLID },
    submission: { type: new GraphQLList(SubmissionType) },
    iat: isoDate("iat"),
  }),
});
const RoomType = new GraphQLObjectType({
  name: "room",
  fields: () => ({
    _id: { type: GraphQLID },
    roomName: { type: GraphQLString },
    courseTitle: { type: GraphQLString },
    courseCode: { type: GraphQLString },
    members: { type: new GraphQLList(UserType) },
    admin: { type: UserType },
    tasks: { type: new GraphQLList(TaskType) },
    iat: isoDate("iat"),
    // per-caller flag the REST responses used to attach to the room object
    isJoined: { type: GraphQLBoolean },
  }),
});
const MyClassroomsType = new GraphQLObjectType({
  name: "myClassrooms",
  fields: () => ({
    myRoom: { type: new GraphQLList(RoomType) },
    joinedRoom: { type: new GraphQLList(RoomType) },
  }),
});

// GraphQL Query
const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    getDepartments: {
      type: new GraphQLList(GraphQLString),
      async resolve(_, args) {
        const book = await Book.find();
        const question = await Question.find();
        const syllabus = await Syllabus.find();
        let dept = await [
          ...new Set([
            ...book.map(({ categories, status }) =>
              status ? categories : null
            ),
            ...question.map(({ categories, status }) =>
              status ? categories : null
            ),
            ...syllabus.map(({ categories, status }) =>
              status ? categories : null
            ),
          ]),
        ];
        return dept;
      },
    },
    getBook: {
      type: BookType,
      args: { _id: { type: GraphQLID } },
      resolve(_, args) {
        return Book.findById(args?._id);
      },
    },
    getBooks: {
      type: new GraphQLList(BookType),
      resolve(_, args, req) {
        return Book.find().sort("book_name");
      },
    },
    getQuestion: {
      type: QuestionType,
      args: { _id: { type: GraphQLID } },
      resolve(_, args) {
        return Question.findById(args?._id);
      },
    },
    getQuestions: {
      type: new GraphQLList(QuestionType),
      resolve(_, args) {
        return Question.find().sort("book_name");
      },
    },
    getSyllabus: {
      type: SyllabusType,
      args: { _id: { type: GraphQLID } },
      resolve(_, args) {
        return Syllabus.findById(args?._id);
      },
    },
    getAllSyllabus: {
      type: new GraphQLList(SyllabusType),
      resolve(_, args) {
        return Syllabus.find().sort("book_name");
      },
    },
    getUser: {
      type: UserType,
      args: { email: { type: GraphQLString } },
      resolve(_, args) {
        return User.findOne({ email: args.email });
      },
    },
    getUsers: {
      type: new GraphQLList(UserType),
      args: { token: { type: GraphQLString } },
      async resolve(_, args) {
        await requirePermission(args?.token, "user.list");
        return User.find();
      },
    },
    // was GET /api/classroom?email
    getClassrooms: {
      type: MyClassroomsType,
      args: { token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const [myRoom, joinedRoom] = await Promise.all([
          Room.find({ admin: caller._id }),
          Room.find({ members: caller._id }),
        ]);
        return { myRoom, joinedRoom };
      },
    },
    // was GET /api/classroom/:roomid?email
    getClassroom: {
      type: RoomType,
      args: { roomid: { type: GraphQLID }, token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const theRoom = await Room.findById(args?.roomid);
        if (!theRoom) {
          throw new Error("Room doesn't exist!");
        }
        const isMember = theRoom.members.includes(caller._id);
        const isAdmin = theRoom.admin.equals(caller._id);
        if (!isMember && !isAdmin) {
          return {
            roomName: theRoom.roomName,
            courseTitle: theRoom.courseTitle,
            courseCode: theRoom.courseCode,
            isJoined: false,
          };
        }
        await theRoom.populate([
          ...ROOM_PEOPLE_POPULATE,
          {
            path: "tasks",
            options: { sort: { iat: -1 } },
            populate: {
              path: "submission",
              match: isMember ? { user: caller._id } : {},
              populate: {
                path: "user",
                select:
                  "_id department designation email displayName photoURL semester",
              },
            },
          },
        ]);
        return { ...theRoom.toObject(), isJoined: true };
      },
    },
    // was GET /api/material?courseCode
    getMaterial: {
      type: new GraphQLList(BookType),
      args: { courseCode: { type: GraphQLString } },
      async resolve(_, args) {
        if (!args?.courseCode) return [];
        return Book.find({ course_code: args.courseCode.toLowerCase() });
      },
    },
    getRoles: {
      type: new GraphQLList(RoleType),
      args: { token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        // either permission is enough: assigning roles needs to list them too
        if (
          !(await can(caller, "role.manage")) &&
          !(await can(caller, "user.role.assign"))
        ) {
          throw new Error("Unauthorized");
        }
        const roles = await Role.find({}).sort("name");
        // how many users hold each role -- the UI needs it to warn before delete
        const counts = await User.aggregate([
          { $group: { _id: "$role", n: { $sum: 1 } } },
        ]);
        const byName = new Map(counts.map((c) => [c._id, c.n]));
        return roles.map((r) => ({
          ...r.toObject(),
          userCount: byName.get(r.name) || 0,
        }));
      },
    },
    getNotifications: {
      type: NotificationFeedType,
      args: { token: { type: GraphQLString }, limit: { type: GraphQLInt } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const limit = Math.min(Math.max(args?.limit || 20, 1), 50);
        const [items, unread] = await Promise.all([
          Notification.find({ email: caller.email }).sort({ iat: -1 }).limit(limit),
          Notification.countDocuments({ email: caller.email, read: false }),
        ]);
        return { items, unread };
      },
    },
    getPermissionKeys: {
      type: new GraphQLList(PermissionKeyType),
      args: { token: { type: GraphQLString } },
      async resolve(_, args) {
        // authenticated is enough: the vocabulary is not secret (it already
        // ships in the client bundle) and every user should be able to see
        // what their own permissions mean on their profile page
        await requireUser(args?.token);
        const { PERMISSIONS } = require("../permissions");
        return PERMISSION_KEYS.map((key) => ({
          key,
          description: PERMISSIONS[key],
        }));
      },
    },
    getUserStatus: {
      type: UserStatus,
      args: { email: { type: GraphQLString } },
      async resolve(_, args) {
        const searchedUser = await User.findOne({ email: args.email });
        const permissions = await permissionsOf(searchedUser?.role);
        return {
          // kept for the existing client, but derived from a capability now
          // rather than a hardcoded role name
          isAdmin: permissions.includes("user.role.assign"),
          designation: searchedUser?.designation,
          department: searchedUser?.department,
          semester: searchedUser?.semester,
          isProfileComplete: isProfileComplete(searchedUser),
          role: searchedUser?.role,
          permissions,
        };
      },
    },
  },
});

// GraphQL Mutation
const mutation = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    // Adding or creating
    addBook: {
      type: BookType,
      args: { ...GraphQLSchemaTemplateForBook, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        await requirePermission(args?.token, "content.create");
        const newBook = new Book({
          ...args,
          course_code: args?.course_code.toLowerCase(),
        });
        const saved = await newBook.save();
        await notifyReviewers(saved, "book");
        return saved;
      },
    },
    addQuestion: {
      type: QuestionType,
      args: { ...GraphQLSchemaTemplate, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        await requirePermission(args?.token, "content.create");
        const newQuestion = new Question({ ...args });
        const saved = await newQuestion.save();
        await notifyReviewers(saved, "question");
        return saved;
      },
    },
    addSyllabus: {
      type: SyllabusType,
      args: { ...GraphQLSchemaTemplate, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        await requirePermission(args?.token, "content.create");
        const newSyllabus = new Syllabus({ ...args });
        const saved = await newSyllabus.save();
        await notifyReviewers(saved, "syllabus");
        return saved;
      },
    },
    signUp: {
      type: UserType,
      args: { ...GraphQLSchemaForUser },
      resolve(_, args) {
        const newUser = new User({ ...args });
        return newUser.save();
      },
    },
    addUser: {
      type: UserType,
      args: { ...GraphQLSchemaForUser },
      async resolve(_, args) {
        const checkUser = await User.findOne({ email: args?.email });
        if (checkUser) {
          return null;
        }
        return User.create(args);
      },
    },

    // ---- Notifications ----
    registerDevice: {
      type: AuthActionType,
      args: { fcmToken: { type: GraphQLString }, token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        if (!args?.fcmToken) {
          return { success: false, message: "No device token provided" };
        }
        // the same browser can re-register after a token refresh; addToSet keeps
        // it idempotent, and pulling it off other users stops a shared machine
        // from pushing one person's notifications to another
        await User.updateMany(
          { email: { $ne: caller.email }, fcmTokens: args.fcmToken },
          { $pull: { fcmTokens: args.fcmToken } }
        );
        await User.updateOne(
          { email: caller.email },
          { $addToSet: { fcmTokens: args.fcmToken } }
        );
        return { success: true, message: "Device registered" };
      },
    },
    unregisterDevice: {
      type: AuthActionType,
      args: { fcmToken: { type: GraphQLString }, token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        await User.updateOne(
          { email: caller.email },
          { $pull: { fcmTokens: args?.fcmToken } }
        );
        return { success: true, message: "Device removed" };
      },
    },
    markNotificationsRead: {
      type: AuthActionType,
      args: { _id: { type: GraphQLID }, token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        // no _id marks the whole feed read
        const filter = { email: caller.email, read: false };
        if (args?._id) filter._id = args._id;
        const r = await Notification.updateMany(filter, { $set: { read: true } });
        return { success: true, message: `${r.modifiedCount} marked read` };
      },
    },
    // Called by an external scheduler (a free cron service) rather than Vercel
    // Cron, which only allows one daily run on the Hobby plan. Guarded by a
    // shared secret instead of a user token because no user is signed in.
    runDeadlineReminders: {
      type: AuthActionType,
      args: {
        secret: { type: GraphQLString },
        withinHours: { type: GraphQLInt },
      },
      async resolve(_, args) {
        const expected = process.env.CRON_SECRET;
        if (!expected) {
          throw new Error("CRON_SECRET is not configured on the server");
        }
        if (args?.secret !== expected) {
          throw new Error("Unauthorized");
        }
        const hours = Math.min(Math.max(args?.withinHours || 24, 1), 168);
        const now = new Date();
        const cutoff = new Date(now.getTime() + hours * 3600 * 1000);

        // due soon, not already past, and not already reminded
        const tasks = await Task.find({
          deadline: { $gt: now, $lte: cutoff },
          reminderSentAt: null,
        }).populate({ path: "room", select: "roomName members" });

        let notified = 0;
        for (const task of tasks) {
          const memberIds = task.room?.members || [];
          if (memberIds.length) {
            const members = await User.find({ _id: { $in: memberIds } }, "email");
            // skip anyone who has already submitted
            const submitted = await Submission.find(
              { task: task._id },
              "user"
            ).populate({ path: "user", select: "email" });
            const done = new Set(submitted.map((s) => s.user?.email));
            const pending = members
              .map((m) => m.email)
              .filter((e) => e && !done.has(e));
            if (pending.length) {
              const left = Math.round((new Date(task.deadline) - now) / 3600000);
              await notify(pending, {
                title: `Deadline approaching: ${task.title}`,
                body: `Due in about ${left} hour(s) in ${task.room?.roomName || "your classroom"}.`,
                link: task.room?._id ? `/classroom/${task.room._id}` : "/classroom",
                kind: "classroom",
              });
              notified += pending.length;
            }
          }
          task.reminderSentAt = now;
          await task.save();
        }
        return {
          success: true,
          message: `${tasks.length} task(s) processed, ${notified} reminder(s) sent`,
        };
      },
    },

    // ---- Roles & permissions ----
    createRole: {
      type: RoleType,
      args: {
        name: { type: GraphQLString },
        description: { type: GraphQLString },
        permissions: { type: new GraphQLList(GraphQLString) },
        token: { type: GraphQLString },
      },
      async resolve(_, args) {
        await requirePermission(args?.token, "role.manage");
        const name = String(args?.name || "").trim().toLowerCase();
        if (!name) throw new Error("Role name is required");
        if (await Role.findOne({ name })) {
          throw new Error("A role with that name already exists");
        }
        const permissions = (args?.permissions || []).filter((k) =>
          PERMISSION_KEYS.includes(k)
        );
        const created = await new Role({
          name,
          description: args?.description || "",
          permissions,
          protected: false,
          isDefault: false,
        }).save();
        invalidateRolesCache();
        return { ...created.toObject(), userCount: 0 };
      },
    },
    updateRole: {
      type: RoleType,
      args: {
        _id: { type: GraphQLID },
        description: { type: GraphQLString },
        permissions: { type: new GraphQLList(GraphQLString) },
        token: { type: GraphQLString },
      },
      async resolve(_, args) {
        await requirePermission(args?.token, "role.manage");
        const role = await Role.findById(args?._id);
        if (!role) throw new Error("Role not found");
        // the protected role is the lockout insurance -- if its permissions
        // could be edited away there would be no guaranteed way back in
        if (role.protected) {
          throw new Error("This role is protected and cannot be modified");
        }
        const update = {};
        if (args?.description !== undefined) update.description = args.description;
        if (args?.permissions) {
          update.permissions = args.permissions.filter((k) =>
            PERMISSION_KEYS.includes(k)
          );
        }
        const updated = await Role.findByIdAndUpdate(
          args?._id,
          { $set: update },
          { new: true }
        );
        invalidateRolesCache();
        // removing user.role.assign from the last role that grants it would
        // leave nobody able to manage users
        if (!(await someoneCanAssignRoles())) {
          await Role.findByIdAndUpdate(args?._id, {
            $set: { permissions: role.permissions },
          });
          invalidateRolesCache();
          throw new Error(
            "That change would leave nobody able to assign roles"
          );
        }
        const userCount = await User.countDocuments({ role: updated.name });
        return { ...updated.toObject(), userCount };
      },
    },
    deleteRole: {
      type: AuthActionType,
      args: { _id: { type: GraphQLID }, token: { type: GraphQLString } },
      async resolve(_, args) {
        await requirePermission(args?.token, "role.manage");
        const role = await Role.findById(args?._id);
        if (!role) throw new Error("Role not found");
        if (role.protected) {
          throw new Error("This role is protected and cannot be deleted");
        }
        if (role.isDefault) {
          throw new Error("The default role cannot be deleted");
        }
        const holders = await User.countDocuments({ role: role.name });
        if (holders > 0) {
          throw new Error(
            `${holders} user(s) still have this role -- reassign them first`
          );
        }
        await Role.deleteOne({ _id: role._id });
        invalidateRolesCache();
        return { success: true, message: `Role "${role.name}" deleted` };
      },
    },
    assignRole: {
      type: UserType,
      args: {
        _id: { type: GraphQLID },
        roleName: { type: GraphQLString },
        token: { type: GraphQLString },
      },
      async resolve(_, args) {
        const caller = await requirePermission(args?.token, "user.role.assign");
        const target = await User.findById(args?._id);
        if (!target) throw new Error("User not exist!");
        if (target.email === caller.email) {
          throw new Error("User can not update their role by themselves!");
        }
        const nextRole = await Role.findOne({
          name: String(args?.roleName || "").toLowerCase(),
        });
        if (!nextRole) throw new Error("Role not found");
        const currentRole = (await loadRoles()).get(target.role);
        // a protected role cannot be taken away from its holder, and cannot be
        // handed out either -- it is set by the migration script only
        if (currentRole?.protected) {
          throw new Error("This user's role is protected and cannot be changed");
        }
        if (nextRole.protected) {
          throw new Error("This role cannot be assigned");
        }
        const updated = await User.findByIdAndUpdate(
          args?._id,
          { $set: { role: nextRole.name } },
          { new: true }
        );
        if (!(await someoneCanAssignRoles())) {
          await User.findByIdAndUpdate(args?._id, {
            $set: { role: target.role },
          });
          throw new Error("That change would leave nobody able to assign roles");
        }
        await notify([target.email], {
          title: "Your role was changed",
          body: `You are now "${nextRole.name}".`,
          link: "/settings",
          kind: "account",
        });
        return updated;
      },
    },

    // ---- Classroom (was POST /api/classroom/*) ----
    createClassroom: {
      type: RoomType,
      args: {
        roomName: { type: GraphQLString },
        courseTitle: { type: GraphQLString },
        courseCode: { type: GraphQLString },
        token: { type: GraphQLString },
      },
      async resolve(_, args) {
        const caller = await requirePermission(args?.token, "classroom.create");
        return new Room({
          roomName: args?.roomName,
          courseTitle: args?.courseTitle,
          courseCode: args?.courseCode,
          admin: caller._id,
        }).save();
      },
    },
    deleteClassroom: {
      type: AuthActionType,
      args: { roomid: { type: GraphQLID }, token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const theRoom = await Room.findById(args?.roomid);
        if (!theRoom) {
          throw new Error("Room not exist!");
        }
        if (!theRoom.admin.equals(caller._id)) {
          throw new Error("Unauthorized");
        }
        await Room.deleteOne({ _id: theRoom._id });
        return { success: true, message: "Classroom deleted" };
      },
    },
    addMember: {
      type: RoomType,
      args: {
        roomid: { type: GraphQLID },
        memberEmail: { type: GraphQLString },
        token: { type: GraphQLString },
      },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        let theRoom = await Room.findById(args?.roomid);
        if (!theRoom) {
          throw new Error("Room not exist!");
        }

        if (!theRoom.admin.equals(caller._id)) {
          throw new Error("Unauthorized");
        }
        const newMember = await User.findOne({ email: args?.memberEmail });
        if (!newMember) {
          throw new Error("User not exist!");
        }
        if (
          theRoom.admin.equals(newMember._id) ||
          theRoom.members.includes(newMember._id)
        ) {
          throw new Error("User is alraedy added in this room!");
        }
        theRoom.members.push(newMember._id);
        theRoom = await theRoom.save();
        await notify([newMember.email], {
          title: `You were added to ${theRoom.roomName}`,
          body: `${theRoom.courseTitle} (${theRoom.courseCode})`,
          link: `/classroom/${theRoom._id}`,
          kind: "classroom",
        });
        await theRoom.populate(ROOM_PEOPLE_POPULATE);
        return { ...theRoom.toObject(), isJoined: true };
      },
    },
    addBulkMember: {
      type: RoomType,
      args: {
        roomid: { type: GraphQLID },
        semester: { type: GraphQLString },
        department: { type: GraphQLString },
        token: { type: GraphQLString },
      },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        let theRoom = await Room.findById(args?.roomid);
        if (!theRoom) {
          throw new Error("Room not exist!");
        }
        if (!theRoom.admin.equals(caller._id)) {
          throw new Error("Unauthorized");
        }
        const filteredUsers = await User.find({
          semester: args?.semester,
          department: args?.department,
          designation: "student",
        }).select("_id");
        if (!filteredUsers.length) {
          throw new Error("No such user found!");
        }

        const merged = new Map();
        [...filteredUsers.map(({ _id }) => _id), ...theRoom.members].forEach(
          (id) => merged.set(String(id), id)
        );
        const before = new Set(theRoom.members.map((id) => String(id)));
        theRoom.members = Array.from(merged.values());
        theRoom = await theRoom.save();
        // only the genuinely new members, so a repeated bulk add is quiet
        const addedIds = [...merged.keys()].filter((id) => !before.has(id));
        if (addedIds.length) {
          const added = await User.find({ _id: { $in: addedIds } }, "email");
          await notify(added.map((a) => a.email), {
            title: `You were added to ${theRoom.roomName}`,
            body: `${theRoom.courseTitle} (${theRoom.courseCode})`,
            link: `/classroom/${theRoom._id}`,
            kind: "classroom",
          });
        }
        await theRoom.populate(ROOM_PEOPLE_POPULATE);
        return { ...theRoom.toObject(), isJoined: true };
      },
    },

    // ---- Task (was POST /api/task/create) ----
    createTask: {
      type: TaskType,
      args: {
        roomid: { type: GraphQLID },
        title: { type: GraphQLString },
        description: { type: GraphQLString },
        deadline: { type: GraphQLString },
        token: { type: GraphQLString },
      },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const theRoom = await Room.findById(args?.roomid);
        if (!theRoom) {
          throw new Error("Room not exist!");
        }
        if (!theRoom.admin.equals(caller._id)) {
          throw new Error("Unauthorized");
        }
        const newTask = await new Task({
          title: args?.title,
          description: args?.description,
          deadline: args?.deadline,
          room: theRoom._id,
          author: caller._id,
        }).save();
        theRoom.tasks.push(newTask._id);
        await theRoom.save();
        if (theRoom.members?.length) {
          const members = await User.find({ _id: { $in: theRoom.members } }, "email");
          await notify(members.map((m) => m.email), {
            title: `New assignment in ${theRoom.roomName}`,
            body: newTask.title,
            link: `/classroom/${theRoom._id}`,
            kind: "classroom",
          });
        }
        return newTask;
      },
    },

    // ---- Submission (was POST /api/task/:taskid/submit) ----
    submitTask: {
      type: TaskType,
      args: {
        taskid: { type: GraphQLID },
        file: { type: new GraphQLNonNull(GraphQLUpload) },
        token: { type: GraphQLString },
      },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const theRoom = await Room.findOne({
          tasks: args?.taskid,
          members: caller._id,
        });
        if (!theRoom) {
          throw new Error("No such classroom exist");
        }
        const theTask = await Task.findById(args?.taskid);
        if (!theTask) {
          throw new Error("No such task exist");
        }
        if (new Date(theTask.deadline).getTime() - Date.now() <= 0) {
          throw new Error("Submission time exceeded.");
        }

        const { createReadStream, filename, mimetype } = await args.file;
        const extension = String(mimetype).split("/")[1] || "bin";
        const fileId = `${args?.taskid}-${caller.email}-type.${extension}`;
        const destination = path.join(ASSIGNMENTS_DIR, fileId);
        await fs.promises.mkdir(ASSIGNMENTS_DIR, { recursive: true });
        await new Promise((resolve, reject) => {
          createReadStream()
            .pipe(fs.createWriteStream(destination))
            .on("finish", resolve)
            .on("error", reject);
        });

        try {
          let newSubmission = await new Submission({
            fileId,
            originalFilename: filename,
            user: caller._id,
            task: theTask._id,
          }).save();
          theTask.submission.push(newSubmission._id);
          await theTask.save();
          newSubmission = await newSubmission.populate({
            path: "user",
            select:
              "_id department designation email displayName photoURL semester",
          });
          const roomAdmin = await User.findById(theRoom.admin, "email");
          if (roomAdmin?.email) {
            await notify([roomAdmin.email], {
              title: `New submission for ${theTask.title}`,
              body: `${caller.displayName || caller.email} submitted their work`,
              link: `/classroom/${theRoom._id}`,
              kind: "classroom",
            });
          }
          return {
            ...theTask.toObject(),
            submission: [newSubmission.toObject()],
          };
        } catch (err) {
          fs.existsSync(destination) && fs.unlinkSync(destination);
          throw err;
        }
      },
    },
    unsubmitTask: {
      type: TaskType,
      args: {
        submissionid: { type: GraphQLID },
        token: { type: GraphQLString },
      },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const theSubmission = await Submission.findById(
          args?.submissionid
        ).populate({ path: "task" });
        if (!theSubmission) {
          throw new Error("Submission not found");
        }
        if (!theSubmission.user.equals(caller._id)) {
          throw new Error("Unauthorized");
        }
        if (
          new Date(theSubmission.task?.deadline).getTime() - Date.now() <=
          0
        ) {
          throw new Error("Time up. Can't be unsubmitted.");
        }
        const theTask = await Task.findById(theSubmission.task._id);
        if (!theTask) {
          throw new Error("Task not found");
        }
        const index = theTask.submission.indexOf(theSubmission._id);
        if (index < 0) {
          throw new Error("Submission not found in task");
        }
        const localFilePath = path.join(ASSIGNMENTS_DIR, theSubmission.fileId);
        fs.existsSync(localFilePath) && fs.unlinkSync(localFilePath);
        theTask.submission.splice(index, 1);
        await theTask.save();
        await Submission.deleteOne({ _id: theSubmission._id });
        return { ...theTask.toObject(), submission: [] };
      },
    },

    // deleting or remove
    deleteBook: {
      type: BookType,
      args: { ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const doc = await Book.findById(args?._id);
        if (!doc) throw new Error("Content not found");
        await requireOwnerOr(args?.token, doc, "content.delete.any");
        return Book.findByIdAndRemove(args?._id);
      },
    },
    deleteQuestion: {
      type: QuestionType,
      args: { ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const doc = await Question.findById(args?._id);
        if (!doc) throw new Error("Content not found");
        await requireOwnerOr(args?.token, doc, "content.delete.any");
        return Question.findByIdAndRemove(args?._id);
      },
    },
    deleteSyllabus: {
      type: SyllabusType,
      args: { ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const doc = await Syllabus.findById(args?._id);
        if (!doc) throw new Error("Content not found");
        await requireOwnerOr(args?.token, doc, "content.delete.any");
        return Syllabus.findByIdAndRemove(args?._id);
      },
    },

    // Updating or editing
    editBook: {
      type: BookType,
      args: { ...GraphQLSchemaTemplateForBook, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const doc = await Book.findById(args?._id);
        if (!doc) throw new Error("Content not found");
        await requireOwnerOr(args?.token, doc, "content.edit.any");
        const tmp = { ...args, course_code: args?.course_code.toLowerCase() };
        delete tmp._id;
        delete tmp.token;
        return Book.findByIdAndUpdate(args?._id, { $set: tmp }, { new: true });
      },
    },
    editQuestion: {
      type: QuestionType,
      args: { ...GraphQLSchemaTemplate, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const doc = await Question.findById(args?._id);
        if (!doc) throw new Error("Content not found");
        await requireOwnerOr(args?.token, doc, "content.edit.any");
        const tmp = { ...args };
        delete tmp._id;
        delete tmp.token;
        return Question.findByIdAndUpdate(
          args?._id,
          { $set: tmp },
          { new: true }
        );
      },
    },
    editSyllabus: {
      type: SyllabusType,
      args: { ...GraphQLSchemaTemplate, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const doc = await Syllabus.findById(args?._id);
        if (!doc) throw new Error("Content not found");
        await requireOwnerOr(args?.token, doc, "content.edit.any");
        const tmp = { ...args };
        delete tmp._id;
        delete tmp.token;
        return Syllabus.findByIdAndUpdate(
          args?._id,
          { $set: tmp },
          { new: true }
        );
      },
    },
    editProfile: {
      type: UserType,
      args: { ...GraphQLSchemaForUser, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const token = args?.token;
        delete args?.token;
        delete args?.role;
        const decodedEmail = await verifyToken(token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        return User.findOneAndUpdate(
          { email: decodedEmail },
          { $set: { ...args } },
          { new: true }
        );
      },
    },
    editBookStatus: {
      type: BookType,
      args: { ...GraphQLSchemaAuth, status: { type: GraphQLBoolean } },
      async resolve(_, args) {
        await requirePermission(args?.token, "content.approve");
        const updated = await Book.findByIdAndUpdate(
          args?._id,
          { $set: { status: args?.status } },
          { new: true }
        );
        if (updated?.added_by) {
          await notify([updated.added_by], {
            title: args?.status ? "Your upload was approved" : "Your upload was hidden",
            body: `${updated.book_name} (book)`,
            link: "/mycontent",
            kind: "content",
          });
        }
        return updated;
      },
    },
    editQuestionStatus: {
      type: QuestionType,
      args: { ...GraphQLSchemaAuth, status: { type: GraphQLBoolean } },
      async resolve(_, args) {
        await requirePermission(args?.token, "content.approve");
        const updated = await Question.findByIdAndUpdate(
          args?._id,
          { $set: { status: args?.status } },
          { new: true }
        );
        if (updated?.added_by) {
          await notify([updated.added_by], {
            title: args?.status ? "Your upload was approved" : "Your upload was hidden",
            body: `${updated.book_name} (question)`,
            link: "/mycontent",
            kind: "content",
          });
        }
        return updated;
      },
    },
    editSyllabusStatus: {
      type: SyllabusType,
      args: { ...GraphQLSchemaAuth, status: { type: GraphQLBoolean } },
      async resolve(_, args) {
        await requirePermission(args?.token, "content.approve");
        const updated = await Syllabus.findByIdAndUpdate(
          args?._id,
          { $set: { status: args?.status } },
          { new: true }
        );
        if (updated?.added_by) {
          await notify([updated.added_by], {
            title: args?.status ? "Your upload was approved" : "Your upload was hidden",
            body: `${updated.book_name} (syllabus)`,
            link: "/mycontent",
            kind: "content",
          });
        }
        return updated;
      },
    },
    changePassword: {
      type: AuthActionType,
      args: {
        token: { type: GraphQLString },
        newPassword: { type: GraphQLString },
      },
      async resolve(_, args) {
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        if (!args?.newPassword || args?.newPassword.length < 6) {
          return {
            success: false,
            message: "Password must be at least 6 characters long",
          };
        }
        try {
          const firebaseUser = await admin.auth().getUserByEmail(decodedEmail);
          const hasPasswordProvider = firebaseUser?.providerData?.some(
            ({ providerId }) => providerId === "password"
          );
          if (!hasPasswordProvider) {
            return {
              success: false,
              message: "This account has no password to change",
            };
          }
          await admin
            .auth()
            .updateUser(firebaseUser?.uid, { password: args?.newPassword });
          await User.findOneAndUpdate(
            { email: decodedEmail },
            { $set: { password: args?.newPassword } }
          );
          return { success: true, message: "Password updated successfully" };
        } catch (err) {
          return { success: false, message: err.message };
        }
      },
    },
    requestPasswordReset: {
      type: AuthActionType,
      args: { email: { type: GraphQLString } },
      async resolve(_, args) {
        const searchedUser = await User.findOne({ email: args?.email });
        if (!searchedUser) {
          return {
            success: false,
            message: "No account found with this email",
          };
        }
        // Deliberately NOT gated on the account having a password provider.
        // Firebase accepts a reset for a Google-only account and adds a password
        // provider when the link is used, so blocking it would strand two kinds
        // of user: someone who wants to add a password to their Google account,
        // and someone whose password provider was replaced when they signed in
        // with Google on an unverified email/password account.
        try {
          await admin.auth().getUserByEmail(args?.email);
        } catch (err) {
          // a DB row with no Firebase account behind it -- nothing to reset
          return {
            success: false,
            message: "No account found with this email",
          };
        }
        return { success: true, message: "" };
      },
    },
    // Fills in the fields the email signup form makes mandatory but Google
    // cannot supply. Validation lives here rather than only in the form so the
    // DB ends up in the same shape whichever way the user signed up.
    completeProfile: {
      type: AuthActionType,
      args: {
        token: { type: GraphQLString },
        designation: { type: GraphQLString },
        department: { type: GraphQLString },
        semester: { type: GraphQLString },
      },
      async resolve(_, args) {
        // Deliberately not verifyToken(): that helper requires an existing DB
        // row, and this mutation has to work for a signed-in user whose row is
        // missing -- otherwise the profile gate strands them on the form with no
        // way to authenticate and no way out. Trust Firebase for identity here
        // and upsert below.
        let decoded;
        try {
          decoded = await admin.auth().verifyIdToken(args?.token?.split(" ")[1]);
        } catch (err) {
          decoded = null;
        }
        const decodedEmail = decoded?.email || "";
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        if (!DESIGNATIONS.includes(args?.designation)) {
          return { success: false, message: "Please select a designation" };
        }
        if (!args?.department) {
          return { success: false, message: "Please select a department" };
        }
        if (args?.designation === "student" && !args?.semester) {
          return { success: false, message: "Please select a semester" };
        }
        const update = {
          designation: args?.designation,
          department: args?.department,
          // a teacher carries no semester -- clear any stale value
          semester: args?.designation === "student" ? args?.semester : "",
        };
        // upsert: a Google sign-in normally creates the row first via addUser,
        // but if that write was lost the user would otherwise be unable to
        // finish. Rebuild it from the verified token instead of failing.
        await User.findOneAndUpdate(
          { email: decodedEmail },
          {
            $set: update,
            $setOnInsert: {
              email: decodedEmail,
              displayName: decoded?.name || "",
              photoURL: decoded?.picture || "",
              authType: decoded?.firebase?.sign_in_provider || "",
              role: await defaultRoleName(),
            },
          },
          { new: true, upsert: true }
        );
        return { success: true, message: "Profile completed" };
      },
    },
    // Refreshes the Mongo password mirror only -- it never touches Firebase.
    // Firebase's hosted reset page updates the password without telling the
    // server (there is no password-change webhook), so the mirror goes stale.
    // A successful sign-in is the one moment the client holds the plaintext
    // again, so it calls this to heal the mirror. The caller having signed in
    // with this password is what vouches for it; the server cannot re-verify a
    // password against Firebase.
    syncPassword: {
      type: AuthActionType,
      args: {
        token: { type: GraphQLString },
        password: { type: GraphQLString },
      },
      async resolve(_, args) {
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        if (!args?.password) {
          return { success: false, message: "No password provided" };
        }
        // the $ne guard makes this a no-op when the mirror already matches
        const updated = await User.findOneAndUpdate(
          { email: decodedEmail, password: { $ne: args?.password } },
          { $set: { password: args?.password } }
        );
        return {
          success: true,
          message: updated ? "Password mirror updated" : "Already in sync",
        };
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation,
});
