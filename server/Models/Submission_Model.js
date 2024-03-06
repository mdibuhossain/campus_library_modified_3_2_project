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
      default: new Date().toUTCString(),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Submission", SubmissionSchema);
