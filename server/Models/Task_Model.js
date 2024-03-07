const mongoose = require("mongoose");
const { type } = require("os");

const commonConfig = {
  type: String,
  require: true,
  trim: true,
};

const TaskSchema = new mongoose.Schema(
  {
    title: commonConfig,
    description: commonConfig,
    deadline: {
      type: Date,
      require: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    submission: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Submission",
      },
    ],
    iat: {
      type: Date,
      default: Date.now,
    },
  },
);

module.exports = mongoose.model("Task", TaskSchema);
