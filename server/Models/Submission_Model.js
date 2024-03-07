const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    fileUrl: {
      type: String,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
);

module.exports = mongoose.model("Submission", SubmissionSchema);
