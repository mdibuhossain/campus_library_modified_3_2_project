const express = require("express");
const User = require("../Models/User_Model");
const Room = require("../Models/Room_Model");

module.exports.createClassroom = async (req, res) => {
  const { roomName, courseTitle, courseCode, email } = req.body;
  try {
    const findUser = await User.findOne({ email: email });
    if (findUser?._id) {
      const savedRoom = await new Room({
        roomName: roomName,
        courseTitle: courseTitle,
        courseCode: courseCode,
        admin: findUser._id,
      }).save();
      res.status(200).json(savedRoom);
    } else {
      res.status(404).json({ message: "User not exist!" });
    }
  } catch {
    res.status(500).json({
      message: "Something went wrong!",
    });
  }
};

module.exports.addMember = async (req, res) => {
  const { email, roomid } = req.body;
  try {
    const findUser = await User.findOne({ email: email });
    if (findUser?._id) {
      const isUserAlreadyAdded = await Room.findOne({
        _id: roomid,
        members: findUser._id,
      });
      if (isUserAlreadyAdded) {
        res.status(409).json({
          message: "User is alraedy added in this room!",
        });
      } else {
        let modifiedRoom = await Room.findById(roomid);
        if (!modifiedRoom) {
          res.status(404).json({ message: "Room not exist!" });
        } else {
          if (modifiedRoom.admin.equals(findUser._id)) {
            res.status(409).json({
              message: "User is alraedy added in this room!",
            });
          } else {
            modifiedRoom.members.push(findUser._id);
            modifiedRoom = await modifiedRoom.save();
            res.status(200).json(modifiedRoom);
          }
        }
      }
    } else {
      res.status(404).json({ message: "User not exist!" });
    }
  } catch {
    res.status(500).json({
      message: "Something went wrong!",
    });
  }
};

module.exports.getRooms = async (req, res) => {
  const { email } = req.body;
  try {
    const findUser = await User.findOne({ email: email });
    if (findUser?._id) {
      const ownRoom = await Room.find({ admin: findUser._id });
      const joinnedRoom = await Room.find({ members: findUser._id });
      res.status(200).json({
        data: {
          myRoom: ownRoom,
          joinnedRoom: joinnedRoom,
        },
      });
    } else {
      res.status(404).json({ message: "User not exist!" });
    }
  } catch {
    res.status(500).json({
      message: "Something went wrong!",
    });
  }
};
