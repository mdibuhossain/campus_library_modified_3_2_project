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
  assignments: [
    {
      type: String,
    },
  ],
  iat: {
    type: Date,
    default: new Date(),
  },
});

module.exports = mongoose.model("Room", RoomSchema);
