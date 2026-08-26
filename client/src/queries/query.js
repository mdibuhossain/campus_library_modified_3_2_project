import { gql } from "@apollo/client";

// get data
const GET_DEPARTMENTS = gql`
  query GetDepartments {
    getDepartments
  }
`;
const GET_ALL_DATA = gql`
  query GetAllData {
    getBooks {
      _id
      book_name
      download_link
      categories
      sub_categories
      added_by
      status
      author
      edition
      semester
      course_code
    }
    getQuestions {
      _id
      book_name
      download_link
      categories
      sub_categories
      added_by
      status
    }
    getAllSyllabus {
      _id
      book_name
      download_link
      categories
      sub_categories
      added_by
      status
    }
  }
`;
const GET_BOOKS = gql`
  query GetBooks {
    getBooks {
      _id
      book_name
      download_link
      categories
      sub_categories
      added_by
      status
      author
      edition
      semester
      course_code
    }
  }
`;
const GET_QUESTIONS = gql`
  query GetQuestions {
    getQuestions {
      _id
      book_name
      download_link
      categories
      sub_categories
      added_by
      status
    }
  }
`;
const GET_SYLLABUS = gql`
  query GetAllSyllabus {
    getAllSyllabus {
      _id
      book_name
      download_link
      categories
      sub_categories
      added_by
      status
    }
  }
`;
const GET_USER = gql`
  query GetUser($email: String) {
    getUser(email: $email) {
      _id
      displayName
      email
      password
      photoURL
      authType
      designation
      department
      role
    }
  }
`;
const GET_USERS = gql`
  query GetUsers($token: String!) {
    getUsers(token: $token) {
      _id
      displayName
      email
      photoURL
      authType
      designation
      department
      role
    }
  }
`;
const GET_USER_STATUS = gql`
  query GetUserStatus($email: String!) {
    getUserStatus(email: $email) {
      isAdmin
      designation
      department
      semester
      isProfileComplete
      role
      permissions
    }
  }
`;

// post data
const POST_BOOK = gql`
  mutation AddBook(
    $book_name: String
    $download_link: String
    $categories: String
    $sub_categories: String
    $added_by: String
    $status: Boolean
    $author: String
    $edition: String
    $semester: [String]
    $course_code: String
    $token: String
  ) {
    addBook(
      book_name: $book_name
      download_link: $download_link
      categories: $categories
      sub_categories: $sub_categories
      added_by: $added_by
      status: $status
      author: $author
      edition: $edition
      semester: $semester
      course_code: $course_code
      token: $token
    ) {
      _id
      book_name
      download_link
      categories
      sub_categories
      added_by
      status
      author
      edition
      semester
      course_code
    }
  }
`;
const POST_QUESTION = gql`
  mutation AddQuestion(
    $book_name: String
    $download_link: String
    $categories: String
    $sub_categories: String
    $added_by: String
    $status: Boolean
    $token: String
  ) {
    addQuestion(
      book_name: $book_name
      download_link: $download_link
      categories: $categories
      sub_categories: $sub_categories
      added_by: $added_by
      status: $status
      token: $token
    ) {
      _id
      book_name
      download_link
      categories
      sub_categories
      added_by
      status
    }
  }
`;
const POST_SYLLABUS = gql`
  mutation AddSyllabus(
    $book_name: String
    $download_link: String
    $categories: String
    $sub_categories: String
    $added_by: String
    $status: Boolean
    $token: String
  ) {
    addSyllabus(
      book_name: $book_name
      download_link: $download_link
      categories: $categories
      sub_categories: $sub_categories
      added_by: $added_by
      status: $status
      token: $token
    ) {
      _id
      book_name
      download_link
      categories
      sub_categories
      added_by
      status
    }
  }
`;
const POST_USER = gql`
  mutation AddUser(
    $displayName: String
    $email: String
    $password: String
    $authType: String
    $photoURL: String
  ) {
    addUser(
      displayName: $displayName
      email: $email
      password: $password
      authType: $authType
      photoURL: $photoURL
    ) {
      _id
    }
  }
`;

// ---- Chat (1:1 messaging over Mongo, made live by FCM push + a short poll) ----
const SEARCH_USERS = gql`
  query SearchUsers($query: String!, $token: String!, $limit: Int) {
    searchUsers(query: $query, token: $token, limit: $limit) {
      _id
      displayName
      email
      photoURL
      designation
      department
    }
  }
`;
const GET_CONVERSATIONS = gql`
  query GetConversations($token: String!) {
    getConversations(token: $token) {
      _id
      lastMessage
      lastMessageAt
      lastMessageFrom
      unread
      other {
        displayName
        email
        photoURL
        designation
        department
      }
    }
  }
`;
const GET_UNREAD_MESSAGE_COUNT = gql`
  query GetUnreadMessageCount($token: String!) {
    getUnreadMessageCount(token: $token)
  }
`;
const GET_MESSAGES = gql`
  query GetMessages($conversationId: ID!, $after: ID, $limit: Int, $token: String!) {
    getMessages(conversationId: $conversationId, after: $after, limit: $limit, token: $token) {
      _id
      from
      body
      iat
      mine
    }
  }
`;
const START_CONVERSATION = gql`
  mutation StartConversation($email: String!, $token: String!) {
    startConversation(email: $email, token: $token) {
      _id
      unread
      other {
        displayName
        email
        photoURL
      }
    }
  }
`;
const SEND_MESSAGE = gql`
  mutation SendMessage($conversationId: ID!, $body: String!, $token: String!) {
    sendMessage(conversationId: $conversationId, body: $body, token: $token) {
      _id
      from
      body
      iat
      mine
    }
  }
`;
const MARK_CONVERSATION_READ = gql`
  mutation MarkConversationRead($conversationId: ID!, $token: String!) {
    markConversationRead(conversationId: $conversationId, token: $token) {
      success
      message
    }
  }
`;

// ---- Notifications (FCM push + in-app history) ----
const GET_NOTIFICATIONS = gql`
  query GetNotifications($token: String!, $limit: Int) {
    getNotifications(token: $token, limit: $limit) {
      unread
      items {
        _id
        title
        body
        link
        kind
        read
        iat
      }
    }
  }
`;
const REGISTER_DEVICE = gql`
  mutation RegisterDevice($fcmToken: String!, $token: String!) {
    registerDevice(fcmToken: $fcmToken, token: $token) {
      success
      message
    }
  }
`;
const UNREGISTER_DEVICE = gql`
  mutation UnregisterDevice($fcmToken: String!, $token: String!) {
    unregisterDevice(fcmToken: $fcmToken, token: $token) {
      success
      message
    }
  }
`;
const MARK_NOTIFICATIONS_READ = gql`
  mutation MarkNotificationsRead($_id: ID, $token: String!) {
    markNotificationsRead(_id: $_id, token: $token) {
      success
      message
    }
  }
`;

// ---- Classroom (replaces the old REST /api routes) ----
const ROOM_PEOPLE_FIELDS = `
  displayName
  email
  photoURL
`;
const TASK_FIELDS = `
  _id
  title
  description
  deadline
  iat
  submission {
    _id
    fileId
    originalFilename
    submittedAt
    user {
      displayName
      email
      photoURL
    }
  }
`;
const GET_CLASSROOMS = gql`
  query GetClassrooms($token: String!) {
    getClassrooms(token: $token) {
      myRoom { _id roomName courseTitle courseCode }
      joinedRoom { _id roomName courseTitle courseCode }
    }
  }
`;
const GET_CLASSROOM = gql`
  query GetClassroom($roomid: ID!, $token: String!) {
    getClassroom(roomid: $roomid, token: $token) {
      _id
      roomName
      courseTitle
      courseCode
      isJoined
      members { ${ROOM_PEOPLE_FIELDS} }
      admin { ${ROOM_PEOPLE_FIELDS} }
      tasks { ${TASK_FIELDS} }
    }
  }
`;
const GET_MATERIAL = gql`
  query GetMaterial($courseCode: String!) {
    getMaterial(courseCode: $courseCode) {
      _id
      book_name
      author
      edition
      download_link
      status
    }
  }
`;
const CREATE_CLASSROOM = gql`
  mutation CreateClassroom(
    $roomName: String!
    $courseTitle: String!
    $courseCode: String!
    $token: String!
  ) {
    createClassroom(
      roomName: $roomName
      courseTitle: $courseTitle
      courseCode: $courseCode
      token: $token
    ) {
      _id
      roomName
      courseTitle
      courseCode
    }
  }
`;
const DELETE_CLASSROOM = gql`
  mutation DeleteClassroom($roomid: ID!, $token: String!) {
    deleteClassroom(roomid: $roomid, token: $token) {
      success
      message
    }
  }
`;
const ADD_MEMBER = gql`
  mutation AddMember($roomid: ID!, $memberEmail: String!, $token: String!) {
    addMember(roomid: $roomid, memberEmail: $memberEmail, token: $token) {
      _id
      roomName
      courseTitle
      courseCode
      isJoined
      members { ${ROOM_PEOPLE_FIELDS} }
      admin { ${ROOM_PEOPLE_FIELDS} }
      tasks { ${TASK_FIELDS} }
    }
  }
`;
const ADD_BULK_MEMBER = gql`
  mutation AddBulkMember(
    $roomid: ID!
    $semester: String!
    $department: String!
    $token: String!
  ) {
    addBulkMember(
      roomid: $roomid
      semester: $semester
      department: $department
      token: $token
    ) {
      _id
      roomName
      courseTitle
      courseCode
      isJoined
      members { ${ROOM_PEOPLE_FIELDS} }
      admin { ${ROOM_PEOPLE_FIELDS} }
      tasks { ${TASK_FIELDS} }
    }
  }
`;
const CREATE_TASK = gql`
  mutation CreateTask(
    $roomid: ID!
    $title: String!
    $description: String!
    $deadline: String!
    $token: String!
  ) {
    createTask(
      roomid: $roomid
      title: $title
      description: $description
      deadline: $deadline
      token: $token
    ) {
      ${TASK_FIELDS}
    }
  }
`;
const SUBMIT_TASK = gql`
  mutation SubmitTask($taskid: ID!, $file: Upload!, $token: String!) {
    submitTask(taskid: $taskid, file: $file, token: $token) {
      ${TASK_FIELDS}
    }
  }
`;
const UNSUBMIT_TASK = gql`
  mutation UnsubmitTask($submissionid: ID!, $token: String!) {
    unsubmitTask(submissionid: $submissionid, token: $token) {
      ${TASK_FIELDS}
    }
  }
`;

// update data
const UPDATE_BOOK = gql`
  mutation EditBook(
    $_id: ID
    $book_name: String
    $download_link: String
    $categories: String
    $sub_categories: String
    $author: String
    $semester: [String]
    $course_code: String
    $edition: String
    $token: String
  ) {
    editBook(
      _id: $_id
      book_name: $book_name
      download_link: $download_link
      categories: $categories
      sub_categories: $sub_categories
      author: $author
      semester: $semester
      course_code: $course_code
      edition: $edition
      token: $token
    ) {
      _id
    }
  }
`;
const UPDATE_QUESTION = gql`
  mutation EditQuestion(
    $_id: ID
    $book_name: String
    $download_link: String
    $categories: String
    $sub_categories: String
    $token: String
  ) {
    editQuestion(
      _id: $_id
      book_name: $book_name
      download_link: $download_link
      categories: $categories
      sub_categories: $sub_categories
      token: $token
    ) {
      _id
    }
  }
`;
const UPDATE_SYLLABUS = gql`
  mutation EditSyllabus(
    $_id: ID
    $book_name: String
    $download_link: String
    $categories: String
    $sub_categories: String
    $token: String
  ) {
    editSyllabus(
      _id: $_id
      book_name: $book_name
      download_link: $download_link
      categories: $categories
      sub_categories: $sub_categories
      token: $token
    ) {
      _id
    }
  }
`;
const UPDATE_PROFILE = gql`
  mutation EditProfile(
    $photoURL: String
    $displayName: String
    $token: String!
  ) {
    editProfile(photoURL: $photoURL, displayName: $displayName, token: $token) {
      _id
    }
  }
`;
const GET_ROLES = gql`
  query GetRoles($token: String!) {
    getRoles(token: $token) {
      _id
      name
      description
      permissions
      protected
      isDefault
      userCount
    }
  }
`;
const GET_PERMISSION_KEYS = gql`
  query GetPermissionKeys($token: String!) {
    getPermissionKeys(token: $token) {
      key
      description
    }
  }
`;
const CREATE_ROLE = gql`
  mutation CreateRole(
    $name: String!
    $description: String
    $permissions: [String]
    $token: String!
  ) {
    createRole(
      name: $name
      description: $description
      permissions: $permissions
      token: $token
    ) {
      _id
      name
      permissions
    }
  }
`;
const UPDATE_ROLE = gql`
  mutation UpdateRole(
    $_id: ID!
    $description: String
    $permissions: [String]
    $token: String!
  ) {
    updateRole(
      _id: $_id
      description: $description
      permissions: $permissions
      token: $token
    ) {
      _id
      name
      permissions
    }
  }
`;
const DELETE_ROLE = gql`
  mutation DeleteRole($_id: ID!, $token: String!) {
    deleteRole(_id: $_id, token: $token) {
      success
      message
    }
  }
`;
const ASSIGN_ROLE = gql`
  mutation AssignRole($_id: ID!, $roleName: String!, $token: String!) {
    assignRole(_id: $_id, roleName: $roleName, token: $token) {
      _id
      email
      role
    }
  }
`;
const CHANGE_PASSWORD = gql`
  mutation ChangePassword($token: String!, $newPassword: String!) {
    changePassword(token: $token, newPassword: $newPassword) {
      success
      message
    }
  }
`;
const COMPLETE_PROFILE = gql`
  mutation CompleteProfile(
    $token: String!
    $designation: String!
    $department: String!
    $semester: String
  ) {
    completeProfile(
      token: $token
      designation: $designation
      department: $department
      semester: $semester
    ) {
      success
      message
    }
  }
`;
const SYNC_PASSWORD = gql`
  mutation SyncPassword($token: String!, $password: String!) {
    syncPassword(token: $token, password: $password) {
      success
      message
    }
  }
`;
const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) {
      success
      message
    }
  }
`;

// update status
const UPDATE_STATUS_BOOK = gql`
  mutation EditBookStatus($_id: ID, $token: String, $status: Boolean) {
    editBookStatus(_id: $_id, token: $token, status: $status) {
      _id
    }
  }
`;
const UPDATE_STATUS_QUESTION = gql`
  mutation EditQuestionStatus($_id: ID, $token: String, $status: Boolean) {
    editQuestionStatus(_id: $_id, token: $token, status: $status) {
      _id
    }
  }
`;
const UPDATE_STATUS_SYLLABUS = gql`
  mutation EditSyllabusStatus($_id: ID, $token: String, $status: Boolean) {
    editSyllabusStatus(_id: $_id, token: $token, status: $status) {
      _id
    }
  }
`;

// delete data
const DELETE_BOOK = gql`
  mutation DeleteBook($_id: ID, $token: String) {
    deleteBook(_id: $_id, token: $token) {
      _id
    }
  }
`;
const DELETE_QUESTION = gql`
  mutation DeleteQuestion($_id: ID, $token: String) {
    deleteQuestion(_id: $_id, token: $token) {
      _id
    }
  }
`;
const DELETE_SYLLABUS = gql`
  mutation DeleteSyllabus($_id: ID, $token: String) {
    deleteSyllabus(_id: $_id, token: $token) {
      _id
    }
  }
`;

export {
  GET_USER,
  GET_BOOKS,
  GET_USER_STATUS,
  GET_USERS,
  GET_ALL_DATA,
  GET_SYLLABUS,
  GET_QUESTIONS,
  GET_DEPARTMENTS,
  POST_USER,
  POST_BOOK,
  POST_QUESTION,
  POST_SYLLABUS,
  SEARCH_USERS,
  GET_CONVERSATIONS,
  GET_UNREAD_MESSAGE_COUNT,
  GET_MESSAGES,
  START_CONVERSATION,
  SEND_MESSAGE,
  MARK_CONVERSATION_READ,
  GET_NOTIFICATIONS,
  REGISTER_DEVICE,
  UNREGISTER_DEVICE,
  MARK_NOTIFICATIONS_READ,
  GET_ROLES,
  GET_PERMISSION_KEYS,
  CREATE_ROLE,
  UPDATE_ROLE,
  DELETE_ROLE,
  ASSIGN_ROLE,
  CHANGE_PASSWORD,
  COMPLETE_PROFILE,
  GET_CLASSROOMS,
  GET_CLASSROOM,
  GET_MATERIAL,
  CREATE_CLASSROOM,
  DELETE_CLASSROOM,
  ADD_MEMBER,
  ADD_BULK_MEMBER,
  CREATE_TASK,
  SUBMIT_TASK,
  UNSUBMIT_TASK,
  SYNC_PASSWORD,
  REQUEST_PASSWORD_RESET,
  UPDATE_BOOK,
  UPDATE_PROFILE,
  UPDATE_QUESTION,
  UPDATE_SYLLABUS,
  DELETE_BOOK,
  DELETE_QUESTION,
  DELETE_SYLLABUS,
  UPDATE_STATUS_BOOK,
  UPDATE_STATUS_SYLLABUS,
  UPDATE_STATUS_QUESTION,
};
