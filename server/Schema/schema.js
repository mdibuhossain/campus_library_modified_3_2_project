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
const Conversation = require("../Models/Conversation_Model");
const Message = require("../Models/Message_Model");
const { notify } = require("../notifications");
const { PERMISSION_KEYS, SUPPORT_PERMISSIONS } = require("../permissions");
const AuditLog = require("../Models/AuditLog_Model");
const { recordAudit, changedFields } = require("../audit");
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

const requireSuperadmin = async (token) => {
  const caller = await requireUser(token);
  const role = (await loadRoles()).get(caller.role);
  if (!role?.protected) throw new Error("Unauthorized");
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

// Regex-escaped so a user typing "a.b" or "c+d" searches literally instead of
// injecting a pattern (and "(((" cannot blow up the regex engine).
const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Shapes a conversation for the caller: resolves the other participant and
// flattens that person's unread counter.
const shapeConversation = async (convo, callerEmail) => {
  const otherEmail = (convo.participants || []).find((p) => p !== callerEmail);
  const other = otherEmail
    ? await User.findOne({ email: otherEmail }, "displayName email photoURL designation department")
    : null;
  return {
    _id: convo._id,
    other,
    lastMessage: convo.lastMessage,
    lastMessageAt: convo.lastMessageAt,
    lastMessageFrom: convo.lastMessageFrom,
    unread: convo.unreadCounts?.[(convo.participants || []).indexOf(callerEmail)] || 0,
  };
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
    // the protected/root role. Not a permission, so it cannot be self-granted
    isSuperadmin: { type: GraphQLBoolean },
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
// A deliberately thin view of another user: chat needs enough to recognise
// somebody, not the whole record. getUsers stays behind user.list.
const PublicUserType = new GraphQLObjectType({
  name: "publicUser",
  fields: () => ({
    _id: { type: GraphQLID },
    displayName: { type: GraphQLString },
    email: { type: GraphQLString },
    photoURL: { type: GraphQLString },
    designation: { type: GraphQLString },
    department: { type: GraphQLString },
  }),
});
/* A member of the team, for the Talk to admin page.
 *
 * Deliberately separate from publicUser: it carries `role` and
 * `roleDescription`, which publicUser must not, because searchUsers hands
 * publicUser records to anyone who types two characters. Only staff are ever
 * returned here, and their role is the reason they are listed -- a reader needs
 * it to pick the right person. */
const SupportContactType = new GraphQLObjectType({
  name: "supportContact",
  fields: () => ({
    _id: { type: GraphQLID },
    displayName: { type: GraphQLString },
    email: { type: GraphQLString },
    photoURL: { type: GraphQLString },
    designation: { type: GraphQLString },
    department: { type: GraphQLString },
    role: { type: GraphQLString },
    roleDescription: { type: GraphQLString },
  }),
});
/* ------------------------------------------------------------------ history
 * Types for getUserHistory (superadmin only).
 *
 * On timestamps: Room, Task, Submission, Message and Notification each carry a
 * real date field, and those are used. User, Book, Question and Syllabus carry
 * none, so `createdAt`/`joinedAt` for those is recovered from the ObjectId,
 * which embeds its creation second -- a true creation time, not a guess.
 *
 * No collection records an EDIT, in either case: an update leaves the _id alone
 * and overwrites the row. Edit times therefore come only from the audit log,
 * which starts at deployment.
 */
const HistoryUploadType = new GraphQLObjectType({
  name: "historyUpload",
  fields: () => ({
    _id: { type: GraphQLID },
    kind: { type: GraphQLString },
    title: { type: GraphQLString },
    department: { type: GraphQLString },
    subCategory: { type: GraphQLString },
    status: { type: GraphQLBoolean },
    downloadLink: { type: GraphQLString },
    createdAt: { type: GraphQLString },
  }),
});
const HistoryMessageType = new GraphQLObjectType({
  name: "historyMessage",
  fields: () => ({
    _id: { type: GraphQLID },
    conversationId: { type: GraphQLID },
    body: { type: GraphQLString },
    iat: { type: GraphQLString },
    outgoing: { type: GraphQLBoolean },
    counterpartEmail: { type: GraphQLString },
    counterpartName: { type: GraphQLString },
  }),
});
/* One channel of the user's chat: the person on the other side, plus the
 * messages exchanged with them in reading order. `messageCount` is the true
 * total for the thread and `shownCount` is how many of them this response
 * carries, so the UI can say "showing 40 of 312" rather than quietly truncate. */
const HistoryConversationType = new GraphQLObjectType({
  name: "historyConversation",
  fields: () => ({
    _id: { type: GraphQLID },
    counterpartEmail: { type: GraphQLString },
    counterpartName: { type: GraphQLString },
    counterpartPhoto: { type: GraphQLString },
    counterpartDesignation: { type: GraphQLString },
    counterpartDepartment: { type: GraphQLString },
    messageCount: { type: GraphQLInt },
    shownCount: { type: GraphQLInt },
    lastMessage: { type: GraphQLString },
    lastMessageAt: { type: GraphQLString },
    messages: { type: new GraphQLList(HistoryMessageType) },
  }),
});
const HistoryRoomType = new GraphQLObjectType({
  name: "historyRoom",
  fields: () => ({
    _id: { type: GraphQLID },
    name: { type: GraphQLString },
    role: { type: GraphQLString },
    memberCount: { type: GraphQLInt },
    createdAt: { type: GraphQLString },
  }),
});
const HistoryTaskType = new GraphQLObjectType({
  name: "historyTask",
  fields: () => ({
    _id: { type: GraphQLID },
    title: { type: GraphQLString },
    roomName: { type: GraphQLString },
    deadline: { type: GraphQLString },
    createdAt: { type: GraphQLString },
  }),
});
const HistorySubmissionType = new GraphQLObjectType({
  name: "historySubmission",
  fields: () => ({
    _id: { type: GraphQLID },
    taskTitle: { type: GraphQLString },
    roomName: { type: GraphQLString },
    filename: { type: GraphQLString },
    submittedAt: { type: GraphQLString },
  }),
});
const HistoryNotificationType = new GraphQLObjectType({
  name: "historyNotification",
  fields: () => ({
    _id: { type: GraphQLID },
    title: { type: GraphQLString },
    body: { type: GraphQLString },
    kind: { type: GraphQLString },
    read: { type: GraphQLBoolean },
    iat: { type: GraphQLString },
  }),
});
const AuditEntryType = new GraphQLObjectType({
  name: "auditEntry",
  fields: () => ({
    _id: { type: GraphQLID },
    actor: { type: GraphQLString },
    action: { type: GraphQLString },
    targetType: { type: GraphQLString },
    targetLabel: { type: GraphQLString },
    subject: { type: GraphQLString },
    // Mixed in Mongo; serialised so the client can render it without the
    // schema having to enumerate every action's shape
    details: { type: GraphQLString },
    iat: { type: GraphQLString },
  }),
});
const HistoryCountsType = new GraphQLObjectType({
  name: "historyCounts",
  fields: () => ({
    books: { type: GraphQLInt },
    questions: { type: GraphQLInt },
    syllabus: { type: GraphQLInt },
    pending: { type: GraphQLInt },
    messages: { type: GraphQLInt },
    conversations: { type: GraphQLInt },
    roomsOwned: { type: GraphQLInt },
    roomsJoined: { type: GraphQLInt },
    tasks: { type: GraphQLInt },
    submissions: { type: GraphQLInt },
    notifications: { type: GraphQLInt },
    actions: { type: GraphQLInt },
    receivedActions: { type: GraphQLInt },
  }),
});
const UserHistoryType = new GraphQLObjectType({
  name: "userHistory",
  fields: () => ({
    _id: { type: GraphQLID },
    displayName: { type: GraphQLString },
    email: { type: GraphQLString },
    photoURL: { type: GraphQLString },
    authType: { type: GraphQLString },
    designation: { type: GraphQLString },
    department: { type: GraphQLString },
    semester: { type: GraphQLString },
    role: { type: GraphQLString },
    roleDescription: { type: GraphQLString },
    permissions: { type: new GraphQLList(GraphQLString) },
    isProfileComplete: { type: GraphQLBoolean },
    deviceCount: { type: GraphQLInt },
    joinedAt: { type: GraphQLString },
    counts: { type: HistoryCountsType },
    uploads: { type: new GraphQLList(HistoryUploadType) },
    conversations: { type: new GraphQLList(HistoryConversationType) },
    roomsOwned: { type: new GraphQLList(HistoryRoomType) },
    roomsJoined: { type: new GraphQLList(HistoryRoomType) },
    tasks: { type: new GraphQLList(HistoryTaskType) },
    submissions: { type: new GraphQLList(HistorySubmissionType) },
    notifications: { type: new GraphQLList(HistoryNotificationType) },
    actions: { type: new GraphQLList(AuditEntryType) },
    receivedActions: { type: new GraphQLList(AuditEntryType) },
  }),
});

const MessageType = new GraphQLObjectType({
  name: "message",
  fields: () => ({
    _id: { type: GraphQLID },
    from: { type: GraphQLString },
    body: { type: GraphQLString },
    iat: isoDate("iat"),
    mine: { type: GraphQLBoolean },
  }),
});
const ConversationType = new GraphQLObjectType({
  name: "conversation",
  fields: () => ({
    _id: { type: GraphQLID },
    // the participant who is not the caller
    other: { type: PublicUserType },
    lastMessage: { type: GraphQLString },
    lastMessageAt: isoDate("lastMessageAt"),
    lastMessageFrom: { type: GraphQLString },
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
    // Discovery. Any signed-in user may search, but only by an explicit query
    // and only for a capped number of thin records -- this is not a directory
    // dump, which is what getUsers (user.list) is for.
    searchUsers: {
      type: new GraphQLList(PublicUserType),
      args: {
        query: { type: GraphQLString },
        token: { type: GraphQLString },
        limit: { type: GraphQLInt },
      },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const q = String(args?.query || "").trim();
        // a 1-character search would return most of the collection
        if (q.length < 2) return [];
        const rx = new RegExp(escapeRegex(q), "i");
        const limit = Math.min(Math.max(args?.limit || 10, 1), 25);
        return User.find(
          {
            email: { $ne: caller.email },
            $or: [{ displayName: rx }, { email: rx }],
          },
          "displayName email photoURL designation department"
        )
          .sort("displayName")
          .limit(limit);
      },
    },
    /* The team a reader can write to.
     *
     * Signed-in only, because the outcome of picking someone is
     * startConversation, which is itself signed-in only -- listing contacts to
     * a visitor who cannot message them would be a dead end.
     *
     * Roles are read from the same cache every permission check uses, so this
     * costs one user query. */
    /* Everything recorded about one user. Superadmin only.
     *
     * The `password` column is deliberately NOT returned. It mirrors a
     * plaintext password, and putting that on a screen is a different risk from
     * leaving it in a collection -- a shoulder, a screenshot, a screen share.
     * Nothing here needs it.
     *
     * Each list is capped and ordered newest-first; `counts` is computed with
     * countDocuments so the totals stay honest even when a list is truncated.
     */
    getUserHistory: {
      type: UserHistoryType,
      args: {
        _id: { type: GraphQLID },
        email: { type: GraphQLString },
        token: { type: GraphQLString },
        limit: { type: GraphQLInt },
      },
      async resolve(_, args) {
        await requireSuperadmin(args?.token);

        const target = args?._id
          ? await User.findById(args._id)
          : await User.findOne({ email: String(args?.email || "").toLowerCase() });
        if (!target) throw new Error("User not exist!");

        const email = target.email;
        const cap = Math.min(Math.max(args?.limit || 100, 1), 500);
        const roles = await loadRoles();
        const roleDoc = roles.get(target.role);

        const idDate = (doc) => {
          try { return doc?._id?.getTimestamp?.()?.toISOString() || null; }
          catch { return null; }
        };

        // ---- uploads across the three content collections ----------------
        const uploadOf = (kind) => ({ added_by: email });
        const [books, questions, syllabi] = await Promise.all([
          Book.find(uploadOf(), "book_name categories sub_categories status download_link").sort({ _id: -1 }).limit(cap),
          Question.find(uploadOf(), "book_name categories sub_categories status download_link").sort({ _id: -1 }).limit(cap),
          Syllabus.find(uploadOf(), "book_name categories sub_categories status download_link").sort({ _id: -1 }).limit(cap),
        ]);
        const asUpload = (kind) => (d) => ({
          _id: d._id,
          kind,
          title: d.book_name,
          department: d.categories,
          subCategory: d.sub_categories,
          status: !!d.status,
          downloadLink: d.download_link,
          createdAt: idDate(d),
        });
        const uploads = [
          ...books.map(asUpload("book")),
          ...questions.map(asUpload("question")),
          ...syllabi.map(asUpload("syllabus")),
        ].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

        /* ---- conversations, each with its own thread -------------------
         *
         * Grouped per conversation rather than returned as one flat list.
         * A single stream ordered by time interleaves every correspondent,
         * so a reply sits nowhere near the message it answers and reading a
         * particular exchange means filtering by eye. Chat is per-channel by
         * nature, and the history view should match how the conversation
         * actually happened.
         *
         * Fetched as ONE query over all of the user's conversations plus one
         * aggregate for the true per-thread totals, rather than two queries
         * per conversation. Messages come back newest-first (that is what the
         * cap should keep) and each thread is then reversed for reading order.
         */
        const convos = await Conversation.find({ participants: email })
          .sort({ lastMessageAt: -1 })
          .limit(60);
        const convoIds = convos.map((c) => c._id);
        const counterpart = new Map(
          convos.map((c) => [String(c._id), (c.participants || []).find((x) => x !== email) || ""])
        );

        // a larger budget than the other lists: this one is split across
        // threads, so `cap` alone would starve every channel but the busiest
        const messageCap = Math.min(cap * 6, 2000);
        const [flatMessages, perThreadTotals] = convoIds.length
          ? await Promise.all([
              Message.find({ conversation: { $in: convoIds } }).sort({ _id: -1 }).limit(messageCap),
              Message.aggregate([
                { $match: { conversation: { $in: convoIds } } },
                { $group: { _id: "$conversation", n: { $sum: 1 } } },
              ]),
            ])
          : [[], []];
        const totalPerThread = new Map(perThreadTotals.map((t) => [String(t._id), t.n]));

        // one lookup for every counterpart, rather than one per message
        const others = await User.find(
          { email: { $in: [...new Set([...counterpart.values()].filter(Boolean))] } },
          "displayName email photoURL designation department"
        );
        const otherByEmail = new Map(others.map((u) => [u.email, u]));

        const grouped = new Map(convoIds.map((cid) => [String(cid), []]));
        flatMessages.forEach((m) => {
          const bucket = grouped.get(String(m.conversation));
          if (bucket) bucket.push(m);
        });

        // ---- classroom ----------------------------------------------------
        const [ownedRooms, joinedRooms] = await Promise.all([
          Room.find({ admin: target._id }, "roomName members iat").sort({ _id: -1 }).limit(cap),
          Room.find({ members: target._id, admin: { $ne: target._id } }, "roomName members iat").sort({ _id: -1 }).limit(cap),
        ]);
        const roomName = new Map(
          [...ownedRooms, ...joinedRooms].map((r) => [String(r._id), r.roomName])
        );
        const tasks = await Task.find({ author: target._id }, "title room deadline iat").sort({ _id: -1 }).limit(cap);
        const submissions = await Submission.find({ user: target._id }).sort({ _id: -1 }).limit(cap).populate("task", "title room");

        // rooms referenced by tasks/submissions may not be in the two lists above
        const extraRoomIds = [
          ...tasks.map((t) => String(t.room || "")),
          ...submissions.map((sub) => String(sub.task?.room || "")),
        ].filter((id) => id && !roomName.has(id));
        if (extraRoomIds.length) {
          const extra = await Room.find({ _id: { $in: [...new Set(extraRoomIds)] } }, "roomName");
          extra.forEach((r) => roomName.set(String(r._id), r.roomName));
        }

        const [notifications, actions, receivedActions] = await Promise.all([
          Notification.find({ email }).sort({ iat: -1 }).limit(cap),
          AuditLog.find({ actor: email }).sort({ iat: -1 }).limit(cap),
          AuditLog.find({ subject: email, actor: { $ne: email } }).sort({ iat: -1 }).limit(cap),
        ]);

        // ---- totals, independent of the caps above -----------------------
        const [
          bookCount, questionCount, syllabusCount,
          pendingBooks, pendingQuestions, pendingSyllabus,
          messageCount, ownedCount, joinedCount, taskCount, submissionCount,
          notificationCount, actionCount, receivedCount,
        ] = await Promise.all([
          Book.countDocuments({ added_by: email }),
          Question.countDocuments({ added_by: email }),
          Syllabus.countDocuments({ added_by: email }),
          Book.countDocuments({ added_by: email, status: { $ne: true } }),
          Question.countDocuments({ added_by: email, status: { $ne: true } }),
          Syllabus.countDocuments({ added_by: email, status: { $ne: true } }),
          convoIds.length ? Message.countDocuments({ conversation: { $in: convoIds } }) : 0,
          Room.countDocuments({ admin: target._id }),
          Room.countDocuments({ members: target._id, admin: { $ne: target._id } }),
          Task.countDocuments({ author: target._id }),
          Submission.countDocuments({ user: target._id }),
          Notification.countDocuments({ email }),
          AuditLog.countDocuments({ actor: email }),
          AuditLog.countDocuments({ subject: email, actor: { $ne: email } }),
        ]);

        const asAudit = (a) => ({
          _id: a._id,
          actor: a.actor,
          action: a.action,
          targetType: a.targetType,
          targetLabel: a.targetLabel,
          subject: a.subject,
          details: a.meta && Object.keys(a.meta).length ? JSON.stringify(a.meta) : "",
          iat: a.iat instanceof Date ? a.iat.toISOString() : String(a.iat || ""),
        });

        return {
          _id: target._id,
          displayName: target.displayName,
          email,
          photoURL: target.photoURL,
          authType: target.authType,
          designation: target.designation,
          department: target.department,
          semester: target.semester,
          role: target.role,
          roleDescription: roleDoc?.description || "",
          permissions: roleDoc?.permissions || [],
          isProfileComplete: isProfileComplete(target),
          deviceCount: (target.fcmTokens || []).length,
          joinedAt: idDate(target),
          counts: {
            books: bookCount, questions: questionCount, syllabus: syllabusCount,
            pending: pendingBooks + pendingQuestions + pendingSyllabus,
            messages: messageCount, conversations: convos.length,
            roomsOwned: ownedCount, roomsJoined: joinedCount,
            tasks: taskCount, submissions: submissionCount,
            notifications: notificationCount,
            actions: actionCount, receivedActions: receivedCount,
          },
          uploads,
          conversations: convos.map((c) => {
            const cid = String(c._id);
            const withEmail = counterpart.get(cid) || "";
            const withUser = otherByEmail.get(withEmail);
            // stored newest-first by the query above; a thread reads oldest-first
            const thread = (grouped.get(cid) || []).slice().reverse();
            return {
              _id: c._id,
              counterpartEmail: withEmail,
              counterpartName: withUser?.displayName || withEmail,
              counterpartPhoto: withUser?.photoURL || "",
              counterpartDesignation: withUser?.designation || "",
              counterpartDepartment: withUser?.department || "",
              messageCount: totalPerThread.get(cid) || 0,
              shownCount: thread.length,
              lastMessage: c.lastMessage || "",
              lastMessageAt:
                c.lastMessageAt instanceof Date ? c.lastMessageAt.toISOString() : null,
              messages: thread.map((m) => ({
                _id: m._id,
                conversationId: m.conversation,
                body: m.body,
                iat: m.iat instanceof Date ? m.iat.toISOString() : String(m.iat || ""),
                outgoing: m.from === email,
                counterpartEmail: withEmail,
                counterpartName: withUser?.displayName || withEmail,
              })),
            };
          }),
          roomsOwned: ownedRooms.map((r) => ({
            _id: r._id, name: r.roomName, role: "owner",
            memberCount: (r.members || []).length,
            createdAt: r.iat instanceof Date ? r.iat.toISOString() : idDate(r),
          })),
          roomsJoined: joinedRooms.map((r) => ({
            _id: r._id, name: r.roomName, role: "member",
            memberCount: (r.members || []).length,
            createdAt: r.iat instanceof Date ? r.iat.toISOString() : idDate(r),
          })),
          tasks: tasks.map((t) => ({
            _id: t._id, title: t.title,
            roomName: roomName.get(String(t.room)) || "",
            deadline: t.deadline instanceof Date ? t.deadline.toISOString() : null,
            createdAt: t.iat instanceof Date ? t.iat.toISOString() : idDate(t),
          })),
          submissions: submissions.map((sub) => ({
            _id: sub._id,
            taskTitle: sub.task?.title || "",
            roomName: roomName.get(String(sub.task?.room)) || "",
            filename: sub.originalFilename || "",
            submittedAt:
              sub.submittedAt instanceof Date ? sub.submittedAt.toISOString() : idDate(sub),
          })),
          notifications: notifications.map((n) => ({
            _id: n._id, title: n.title, body: n.body, kind: n.kind, read: !!n.read,
            iat: n.iat instanceof Date ? n.iat.toISOString() : String(n.iat || ""),
          })),
          actions: actions.map(asAudit),
          receivedActions: receivedActions.map(asAudit),
        };
      },
    },
    getSupportContacts: {
      type: new GraphQLList(SupportContactType),
      args: { token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const roles = await loadRoles();

        const staffRoles = [...roles.values()]
          .map((r) => ({
            name: r.name,
            description: r.description || "",
            // seniority = how much of the support surface the role covers
            rank: SUPPORT_PERMISSIONS.filter((k) => (r.permissions || []).includes(k)).length,
          }))
          .filter((r) => r.rank > 0);
        if (staffRoles.length === 0) return [];

        const byRole = new Map(staffRoles.map((r) => [r.name, r]));
        const users = await User.find(
          {
            role: { $in: [...byRole.keys()] },
            // you are not your own support contact
            email: { $ne: caller.email },
          },
          "displayName email photoURL designation department role"
        ).limit(50);

        return users
          .map((u) => {
            const meta = byRole.get(u.role);
            return {
              _id: u._id,
              displayName: u.displayName,
              email: u.email,
              photoURL: u.photoURL,
              designation: u.designation,
              department: u.department,
              role: u.role,
              roleDescription: meta?.description || "",
              rank: meta?.rank || 0,
            };
          })
          // most senior first, then alphabetical, so the list is stable
          .sort(
            (a, b) =>
              b.rank - a.rank ||
              String(a.displayName || a.email).localeCompare(String(b.displayName || b.email))
          );
      },
    },
    getConversations: {
      type: new GraphQLList(ConversationType),
      args: { token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const convos = await Conversation.find({ participants: caller.email })
          .sort({ lastMessageAt: -1 })
          .limit(50);
        return Promise.all(convos.map((c) => shapeConversation(c, caller.email)));
      },
    },
    // total unread across every conversation, for the nav badge
    getUnreadMessageCount: {
      type: GraphQLInt,
      args: { token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const convos = await Conversation.find(
          { participants: caller.email },
          "participants unreadCounts"
        );
        return convos.reduce(
          (n, c) => n + (c.unreadCounts?.[(c.participants || []).indexOf(caller.email)] || 0),
          0
        );
      },
    },
    getMessages: {
      type: new GraphQLList(MessageType),
      args: {
        conversationId: { type: GraphQLID },
        // ascending _id cursor: "give me what arrived after this"
        after: { type: GraphQLID },
        limit: { type: GraphQLInt },
        token: { type: GraphQLString },
      },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const convo = await Conversation.findById(args?.conversationId);
        if (!convo) throw new Error("Conversation not found");
        // being a participant IS the authorisation
        if (!convo.participants.includes(caller.email)) {
          throw new Error("Unauthorized");
        }
        const limit = Math.min(Math.max(args?.limit || 50, 1), 100);
        const filter = { conversation: convo._id };
        if (args?.after) filter._id = { $gt: args.after };
        const rows = await Message.find(filter).sort({ _id: 1 }).limit(limit);
        return rows.map((m) => ({
          _id: m._id,
          from: m.from,
          body: m.body,
          iat: m.iat,
          mine: m.from === caller.email,
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
          isSuperadmin: !!(await loadRoles()).get(searchedUser?.role)?.protected,
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
        const uploader = await requirePermission(args?.token, "content.create");
        const newBook = new Book({
          ...args,
          course_code: args?.course_code.toLowerCase(),
        });
        const saved = await newBook.save();
        recordAudit({
          actor: uploader.email, action: "content.create", targetType: "book",
          targetId: saved._id, targetLabel: saved.book_name,
          subject: saved.added_by || uploader.email,
          meta: { department: saved.categories },
        });
        await notifyReviewers(saved, "book");
        return saved;
      },
    },
    addQuestion: {
      type: QuestionType,
      args: { ...GraphQLSchemaTemplate, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const uploader = await requirePermission(args?.token, "content.create");
        const newQuestion = new Question({ ...args });
        const saved = await newQuestion.save();
        recordAudit({
          actor: uploader.email, action: "content.create", targetType: "question",
          targetId: saved._id, targetLabel: saved.book_name,
          subject: saved.added_by || uploader.email,
          meta: { department: saved.categories },
        });
        await notifyReviewers(saved, "question");
        return saved;
      },
    },
    addSyllabus: {
      type: SyllabusType,
      args: { ...GraphQLSchemaTemplate, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const uploader = await requirePermission(args?.token, "content.create");
        const newSyllabus = new Syllabus({ ...args });
        const saved = await newSyllabus.save();
        recordAudit({
          actor: uploader.email, action: "content.create", targetType: "syllabus",
          targetId: saved._id, targetLabel: saved.book_name,
          subject: saved.added_by || uploader.email,
          meta: { department: saved.categories },
        });
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

    // ---- Chat ----
    /* Opens (or finds) the conversation with one other person.
     *
     * Uses an upsert on the unique pairKey rather than find-then-create: two
     * people opening the chat with each other simultaneously would otherwise
     * both find nothing and both insert, giving one pair two conversations. */
    startConversation: {
      type: ConversationType,
      args: { email: { type: GraphQLString }, token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const otherEmail = String(args?.email || "").trim().toLowerCase();
        if (!otherEmail) throw new Error("No recipient provided");
        if (otherEmail === caller.email) {
          throw new Error("You cannot start a conversation with yourself");
        }
        const other = await User.findOne({ email: otherEmail });
        if (!other) throw new Error("User not exist!");

        const pairKey = Conversation.keyFor(caller.email, otherEmail);
        const convo = await Conversation.findOneAndUpdate(
          { pairKey },
          {
            $setOnInsert: {
              pairKey,
              participants: [caller.email, otherEmail].sort(),
              lastMessage: "",
              lastMessageAt: new Date(),
              lastMessageFrom: "",
              unreadCounts: [0, 0],
            },
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        return shapeConversation(convo, caller.email);
      },
    },
    sendMessage: {
      type: MessageType,
      args: {
        conversationId: { type: GraphQLID },
        body: { type: GraphQLString },
        token: { type: GraphQLString },
      },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const body = String(args?.body || "").trim();
        if (!body) throw new Error("Message is empty");
        if (body.length > 4000) throw new Error("Message is too long");

        const convo = await Conversation.findById(args?.conversationId);
        if (!convo) throw new Error("Conversation not found");
        if (!convo.participants.includes(caller.email)) {
          throw new Error("Unauthorized");
        }
        const recipient = convo.participants.find((p) => p !== caller.email);

        const message = await new Message({
          conversation: convo._id,
          from: caller.email,
          body,
        }).save();

        // $inc the recipient's slot only -- the sender has read their own message
        // by definition. A numeric index, because an email in the path would be
        // split on its dots.
        const recipientIdx = convo.participants.indexOf(recipient);
        await Conversation.updateOne(
          { _id: convo._id },
          {
            $set: {
              lastMessage: body.slice(0, 200),
              lastMessageAt: message.iat,
              lastMessageFrom: caller.email,
            },
            $inc: { [`unreadCounts.${recipientIdx}`]: 1 },
          }
        );

        // This is what makes it feel live without a socket: the recipient gets a
        // push and their client pulls messages after its cursor.
        await notify([recipient], {
          title: caller.displayName || caller.email,
          body: body.slice(0, 120),
          link: `/messages/${convo._id}`,
          kind: "message",
        });

        return {
          _id: message._id,
          from: message.from,
          body: message.body,
          iat: message.iat,
          mine: true,
        };
      },
    },
    markConversationRead: {
      type: AuthActionType,
      args: { conversationId: { type: GraphQLID }, token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requireUser(args?.token);
        const convo = await Conversation.findById(args?.conversationId);
        if (!convo) throw new Error("Conversation not found");
        if (!convo.participants.includes(caller.email)) {
          throw new Error("Unauthorized");
        }
        const callerIdx = convo.participants.indexOf(caller.email);
        await Conversation.updateOne(
          { _id: convo._id },
          { $set: { [`unreadCounts.${callerIdx}`]: 0 } }
        );
        return { success: true, message: "Marked read" };
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
      async resolve(_, args, context) {
        // trimmed: a stray newline or space in a dashboard-pasted env var is a
        // very easy way to get a mismatch that looks like a wrong secret
        const expected = (process.env.CRON_SECRET || "").trim();
        if (!expected) {
          throw new Error("CRON_SECRET is not configured on the server");
        }
        // Accept the secret as a GraphQL variable OR an x-cron-secret header --
        // cron services differ in how reliably they send a JSON body with
        // variables, and a header is usually easier to configure correctly.
        // express-graphql's default context is the Express request.
        const fromHeader = context?.headers?.["x-cron-secret"];
        const provided = String(args?.secret || fromHeader || "").trim();
        // distinguished from a mismatch on purpose: "it never arrived" and "it
        // arrived wrong" need completely different fixes. Neither leaks the value.
        if (!provided) {
          throw new Error(
            "No cron secret received. Send it as the `secret` GraphQL variable or an x-cron-secret header."
          );
        }
        if (provided !== expected) {
          // Lengths only -- never the values. A length difference immediately
          // reveals the usual culprit: quotes or a newline included when the
          // variable was pasted into a hosting dashboard. dotenv strips quotes
          // from a local .env file, so `CRON_SECRET="abc"` works locally while
          // the same paste into Vercel yields a literal 5-character `"abc"`.
          throw new Error(
            `Unauthorized (received ${provided.length} chars, server expects ${expected.length})`
          );
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
        const caller = await requirePermission(args?.token, "role.manage");
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
        recordAudit({
          actor: caller.email, action: "role.create", targetType: "role",
          targetId: created._id, targetLabel: created.name,
          meta: { permissions },
        });
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
        const caller = await requirePermission(args?.token, "role.manage");
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
        /* After the rollback check, so a refused change leaves no row. This is
         * the most security-relevant edit in the app -- it is how a permission
         * gets granted to a role -- so the before/after permission sets are
         * both recorded, not just "updated". */
        recordAudit({
          actor: caller.email, action: "role.update", targetType: "role",
          targetId: updated._id, targetLabel: updated.name,
          meta: {
            permissionsBefore: role.permissions,
            permissionsAfter: updated.permissions,
          },
        });
        const userCount = await User.countDocuments({ role: updated.name });
        return { ...updated.toObject(), userCount };
      },
    },
    deleteRole: {
      type: AuthActionType,
      args: { _id: { type: GraphQLID }, token: { type: GraphQLString } },
      async resolve(_, args) {
        const caller = await requirePermission(args?.token, "role.manage");
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
        recordAudit({
          actor: caller.email, action: "role.delete", targetType: "role",
          targetId: role._id, targetLabel: role.name,
          meta: { permissions: role.permissions },
        });
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
        /* Recorded after the anti-lockout rollback, so a change that was undone
         * does not leave a row claiming it happened. `subject` is the target,
         * which is what makes this show up under "done to this user". */
        recordAudit({
          actor: caller.email, action: "role.assign", targetType: "user",
          targetId: target._id, targetLabel: target.displayName || target.email,
          subject: target.email, meta: { from: target.role, to: nextRole.name },
        });
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
        const remover = await requireOwnerOr(args?.token, doc, "content.delete.any");
        /* The label is captured before the delete on purpose: after this the
         * document is gone, and "deleted <unknown>" would be a useless row. */
        recordAudit({
          actor: remover.email, action: "content.delete", targetType: "book",
          targetId: args?._id, targetLabel: doc.book_name,
          subject: doc.added_by || "",
          meta: { department: doc.categories, wasApproved: !!doc.status },
        });
        return Book.findByIdAndRemove(args?._id);
      },
    },
    deleteQuestion: {
      type: QuestionType,
      args: { ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const doc = await Question.findById(args?._id);
        if (!doc) throw new Error("Content not found");
        const remover = await requireOwnerOr(args?.token, doc, "content.delete.any");
        /* The label is captured before the delete on purpose: after this the
         * document is gone, and "deleted <unknown>" would be a useless row. */
        recordAudit({
          actor: remover.email, action: "content.delete", targetType: "question",
          targetId: args?._id, targetLabel: doc.book_name,
          subject: doc.added_by || "",
          meta: { department: doc.categories, wasApproved: !!doc.status },
        });
        return Question.findByIdAndRemove(args?._id);
      },
    },
    deleteSyllabus: {
      type: SyllabusType,
      args: { ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const doc = await Syllabus.findById(args?._id);
        if (!doc) throw new Error("Content not found");
        const remover = await requireOwnerOr(args?.token, doc, "content.delete.any");
        /* The label is captured before the delete on purpose: after this the
         * document is gone, and "deleted <unknown>" would be a useless row. */
        recordAudit({
          actor: remover.email, action: "content.delete", targetType: "syllabus",
          targetId: args?._id, targetLabel: doc.book_name,
          subject: doc.added_by || "",
          meta: { department: doc.categories, wasApproved: !!doc.status },
        });
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
        const editor = await requireOwnerOr(args?.token, doc, "content.edit.any");
        const tmp = { ...args, course_code: args?.course_code.toLowerCase() };
        delete tmp._id;
        delete tmp.token;
        const fields = changedFields(doc.toObject(), tmp);
        const result = await Book.findByIdAndUpdate(args?._id, { $set: tmp }, { new: true });
        // only worth a row if something actually differs -- opening the edit
        // form and pressing save unchanged is not history
        if (fields.length) {
          recordAudit({
            actor: editor.email, action: "content.edit", targetType: "book",
            targetId: args?._id, targetLabel: result?.book_name || doc.book_name,
            subject: doc.added_by || "", meta: { fields },
          });
        }
        return result;
      },
    },
    editQuestion: {
      type: QuestionType,
      args: { ...GraphQLSchemaTemplate, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const doc = await Question.findById(args?._id);
        if (!doc) throw new Error("Content not found");
        const editor = await requireOwnerOr(args?.token, doc, "content.edit.any");
        const tmp = { ...args };
        delete tmp._id;
        delete tmp.token;
        const fields = changedFields(doc.toObject(), tmp);
        if (fields.length) {
          recordAudit({
            actor: editor.email, action: "content.edit", targetType: "question",
            targetId: args?._id, targetLabel: doc.book_name,
            subject: doc.added_by || "", meta: { fields },
          });
        }
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
        const editor = await requireOwnerOr(args?.token, doc, "content.edit.any");
        const tmp = { ...args };
        delete tmp._id;
        delete tmp.token;
        const fields = changedFields(doc.toObject(), tmp);
        if (fields.length) {
          recordAudit({
            actor: editor.email, action: "content.edit", targetType: "syllabus",
            targetId: args?._id, targetLabel: doc.book_name,
            subject: doc.added_by || "", meta: { fields },
          });
        }
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
        const reviewer = await requirePermission(args?.token, "content.approve");
        const updated = await Book.findByIdAndUpdate(
          args?._id,
          { $set: { status: args?.status } },
          { new: true }
        );
        if (updated) {
          recordAudit({
            actor: reviewer.email,
            action: args?.status ? "content.approve" : "content.hide",
            targetType: "book", targetId: args?._id, targetLabel: updated.book_name,
            subject: updated.added_by || "",
          });
        }
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
        const reviewer = await requirePermission(args?.token, "content.approve");
        const updated = await Question.findByIdAndUpdate(
          args?._id,
          { $set: { status: args?.status } },
          { new: true }
        );
        if (updated) {
          recordAudit({
            actor: reviewer.email,
            action: args?.status ? "content.approve" : "content.hide",
            targetType: "question", targetId: args?._id, targetLabel: updated.book_name,
            subject: updated.added_by || "",
          });
        }
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
        const reviewer = await requirePermission(args?.token, "content.approve");
        const updated = await Syllabus.findByIdAndUpdate(
          args?._id,
          { $set: { status: args?.status } },
          { new: true }
        );
        if (updated) {
          recordAudit({
            actor: reviewer.email,
            action: args?.status ? "content.approve" : "content.hide",
            targetType: "syllabus", targetId: args?._id, targetLabel: updated.book_name,
            subject: updated.added_by || "",
          });
        }
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
