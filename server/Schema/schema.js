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
  role: { type: GraphQLString, defaultValue: "regular" },
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
        const decodedEmail = await verifyToken(args.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        const checkUser = await User.findOne({ email: decodedEmail });
        if (checkUser?.email) {
          return User.find();
        }
        throw new Error("Unauthenticated!");
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
    getUserStatus: {
      type: UserStatus,
      args: { email: { type: GraphQLString } },
      async resolve(_, args) {
        const searchedUser = await User.findOne({ email: args.email });
        return {
          isAdmin: searchedUser?.role === "admin",
          designation: searchedUser?.designation,
          department: searchedUser?.department,
          semester: searchedUser?.semester,
          isProfileComplete: isProfileComplete(searchedUser),
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
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        const newBook = new Book({
          ...args,
          course_code: args?.course_code.toLowerCase(),
        });
        return newBook.save();
      },
    },
    addQuestion: {
      type: QuestionType,
      args: { ...GraphQLSchemaTemplate, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        const newQuestion = new Question({ ...args });
        return newQuestion.save();
      },
    },
    addSyllabus: {
      type: SyllabusType,
      args: { ...GraphQLSchemaTemplate, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        const newSyllabus = new Syllabus({ ...args });
        return newSyllabus.save();
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
        const caller = await requireUser(args?.token);
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
        theRoom.members = Array.from(merged.values());
        theRoom = await theRoom.save();
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
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        return Book.findByIdAndRemove(args?._id);
      },
    },
    deleteQuestion: {
      type: QuestionType,
      args: { ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        return Question.findByIdAndRemove(args?._id);
      },
    },
    deleteSyllabus: {
      type: SyllabusType,
      args: { ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        return Syllabus.findByIdAndRemove(args?._id);
      },
    },

    // Updating or editing
    editBook: {
      type: BookType,
      args: { ...GraphQLSchemaTemplateForBook, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        const tmp = { ...args, course_code: args?.course_code.toLowerCase() };
        delete tmp._id;
        return Book.findByIdAndUpdate(args?._id, { $set: tmp }, { new: true });
      },
    },
    editQuestion: {
      type: QuestionType,
      args: { ...GraphQLSchemaTemplate, ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        const tmp = { ...args };
        delete tmp._id;
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
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        const tmp = { ...args };
        delete tmp._id;
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
        const decodedEmail = await verifyToken(args?.token);
        const adminUser = await User.findOne({ email: decodedEmail });
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        } else if (adminUser?.role === "admin")
          return Book.findByIdAndUpdate(
            args?._id,
            { $set: { status: args?.status } },
            { new: true }
          );
        else throw new Error("Unauthenticated!");
      },
    },
    editQuestionStatus: {
      type: QuestionType,
      args: { ...GraphQLSchemaAuth, status: { type: GraphQLBoolean } },
      async resolve(_, args) {
        const decodedEmail = await verifyToken(args?.token);
        const adminUser = await User.findOne({ email: decodedEmail });
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        } else if (adminUser?.role === "admin")
          return Question.findByIdAndUpdate(
            args?._id,
            { $set: { status: args?.status } },
            { new: true }
          );
        else throw new Error("Unauthenticated!");
      },
    },
    editSyllabusStatus: {
      type: SyllabusType,
      args: { ...GraphQLSchemaAuth, status: { type: GraphQLBoolean } },
      async resolve(_, args) {
        const decodedEmail = await verifyToken(args?.token);
        const adminUser = await User.findOne({ email: decodedEmail });
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        } else if (adminUser?.role === "admin")
          return Syllabus.findByIdAndUpdate(
            args?._id,
            { $set: { status: args?.status } },
            { new: true }
          );
        else throw new Error("Unauthenticated!");
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
              role: "regular",
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
    makeAdmin: {
      type: UserType,
      args: { ...GraphQLSchemaAuth },
      async resolve(_, args) {
        const decodedEmail = await verifyToken(args?.token);
        if (!decodedEmail) {
          throw new Error("Unauthenticated!");
        }
        const checkUser = await User.findOne({ email: decodedEmail });
        if (checkUser?.email) {
          const editUser = await User.findById(args?._id);
          if (editUser?.email === checkUser?.email) {
            throw new Error("User can not update their role by themselves!");
          } else if (editUser?.role === "admin") {
            return User.findByIdAndUpdate(
              args?._id,
              { $set: { role: "regular" } },
              { new: true }
            );
          } else {
            return User.findByIdAndUpdate(
              args?._id,
              { $set: { role: "admin" } },
              { new: true }
            );
          }
        }
        throw new Error("Unauthenticated!");
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation,
});
