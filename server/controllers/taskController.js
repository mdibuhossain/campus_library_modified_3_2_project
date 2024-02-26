const express = require("express");
const User = require("../Models/User_Model");
const Room = require("../Models/Room_Model");
const Task = require("../Models/Task_Model");
const Submission = require("../Models/Submission_Model");

module.exports.createTask = async (req, res) => {
  try {
    const { title, description, deadline, roomid, email } = req.body;
    const checkAdmin = await User.findOne({ email });
    if (!checkAdmin) {
      res.status(404).json({ message: "User not exist!" });
    }
    const theRoom = await Room.findById(roomid);
    if (theRoom.admin.equals(checkAdmin._id)) {
      const newTask = new Task({
        title,
        description,
        deadline,
        room: roomid,
      });
      const result = await newTask.save();
      theRoom.tasks.push(result._id);
      await theRoom.save();
      res.status(200).json(result);
    } else {
      res.status(401).json({
        message: "Unauthorized",
      });
    }
  } catch (e) {
    res.status(500).json({
      message: e.message,
    });
  }
};
