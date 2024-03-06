const mongoose = require("mongoose");

const commonConfig = {
  type: String,
  require: true,
  trim: true,
};

const RoomSchema = new mongoose.Schema({
  roomName: commonConfig,
  courseTitle: commonConfig,
  courseCode: commonConfig,
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  tasks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
  ],
  iat: {
    type: Date,
    default: new Date().toUTCString(),
  },
});

module.exports = mongoose.model("Room", RoomSchema);
