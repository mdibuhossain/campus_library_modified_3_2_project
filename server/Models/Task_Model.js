const mongoose = require("mongoose");

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
    submission: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Submission",
      },
    ],
    iat: {
      type: Date,
      default: new Date(),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", TaskSchema);
