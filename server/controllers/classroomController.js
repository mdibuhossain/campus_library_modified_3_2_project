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
  const { email } = req.query;
  try {
    const findUser = await User.findOne({ email: email });
    if (findUser?._id) {
      const ownRoom = await Room.find({ admin: findUser._id });
      const joinedRoom = await Room.find({ members: findUser._id });
      res.status(200).json({
        myRoom: ownRoom,
        joinedRoom: joinedRoom,
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

module.exports.getRoomDetails = async (req, res) => {
  const { roomid } = req.params;
  const { email } = req.query;
  try {
    const checkUser = await User.findOne({ email: email });
    if (checkUser) {
      const checkRoom = await Room.findById(roomid);
      if (checkRoom) {
        if (checkRoom.members.includes(checkUser._id) || checkRoom.admin.equals(checkUser._id)) {
          await checkRoom.populate("members", "displayName email designation department");
          res.status(200).json({ ...checkRoom, isJoined: true });
        } else {
          res.status(200).json({
            roomName: checkRoom.roomName,
            courseTitle: checkRoom.courseTitle,
            courseCode: checkRoom.courseCode,
            admin: checkRoom.admin,
            isJoined: false
          });
        }
      } else {
        res.status(404).json({
          message: "Group doesn't exist!"
        });
      }
    } else {
      res.status(404).json({ message: "User not exist!" });
    }
  } catch {
    res.status(500).json({
      message: "Something went wrong!",
    });
  }
}