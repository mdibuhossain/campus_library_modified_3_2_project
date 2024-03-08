const fs = require("fs");
const path = require('path')
const express = require("express");
const User = require("../Models/User_Model");
const Room = require("../Models/Room_Model");
const Task = require("../Models/Task_Model");
const Submission = require("../Models/Submission_Model");


module.exports.submitTask = async (req, res) => {
    const { filename, originalname } = req.file
    const localFilePath = path.join("./public/assignments/", filename);
    try {
        const { email } = req.body
        const { taskid } = req.params
        const checkUser = await User.findOne({ email });
        if (checkUser) {
            const checkRoom = await Room.findOne({
                tasks: taskid,
                members: checkUser._id
            })
            if (checkRoom) {
                const checkTask = await Task.findById(taskid);
                if (checkTask) {
                    const deadlineTimeMS = new Date(checkTask.deadline).getTime()
                    const currentTimeMS = Date.now()
                    const remainingTimeMS = deadlineTimeMS - currentTimeMS;
                    if (remainingTimeMS > 0) {
                        let newSubmission = await (new Submission({
                            fileId: filename,
                            originalFilename: originalname,
                            user: checkUser._id,
                            task: checkTask._id
                        })).save()
                        checkTask.submission.push(newSubmission._id)
                        await checkTask.save();
                        newSubmission = await newSubmission.populate({
                            path: "user",
                            select: "_id department designation email displayName photoURL semester"
                        })
                        const result = { ...checkTask.toObject(), submission: [{ ...newSubmission.toObject() }] }
                        return res.status(200).json(result)
                    } else {
                        fs.unlinkSync(localFilePath);
                        return res.status(401).json({ message: "Submission time exceeded." })
                    }
                } else {
                    fs.unlinkSync(localFilePath);
                    return res.status(404).json({ message: "No such task exist" })
                }
            } else {
                fs.unlinkSync(localFilePath);
                return res.status(404).json({ message: "No such classroom exist" })
            }
        } else {
            fs.unlinkSync(localFilePath);
            return res.status(401).json({ message: "Unauthorized user" })
        }
    } catch (e) {
        fs.unlinkSync(localFilePath);
        return res.status(500).json({ message: e.message });
    }
};

module.exports.unSubmitTask = async (req, res) => {
    try {
        const { email } = req.body;
        const { submissionid } = req.params;
        const checkUser = await User.findOne({ email });
        if (checkUser) {
            const checkSubmission = await Submission.findById(submissionid).populate({ path: "task" })
            const deadlineTimeMS = new Date(checkSubmission.task.deadline).getTime();
            const currentTimeMS = Date.now();
            const remainingTimeMS = deadlineTimeMS - currentTimeMS;
            if (remainingTimeMS > 0) {
                const localFilePath = path.join("./public/assignments/", checkSubmission.fileId)
                fs.unlinkSync(localFilePath);
                const checkTask = await Task.findById(checkSubmission.task._id)
                if (checkTask) {
                    const currentSubmissionIndex = checkTask.submission.indexOf(checkSubmission._id);
                    if (currentSubmissionIndex > -1) {
                        checkTask.submission.splice(currentSubmissionIndex, 1);
                        await checkTask.save();
                        await checkSubmission.remove();
                        checkTask.submission = [];
                        return res.status(201).json({ ...checkTask.toObject() })
                    } else {
                        return res.status(404).json({ message: "Submission not found in task" })
                    }
                } else {
                    return res.status(404).json({ message: "Task not found" })
                }
            } else {
                return res.status(401).json({ message: "Time up. Can't be unsubmitted." })
            }
        } else {
            return res.status(401).json({ message: "Unauthorized user" })
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
