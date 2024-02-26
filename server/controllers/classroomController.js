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

module.exports.deleteClassroom = async (req, res) => {
  const { roomid, email } = req.body;
  try {
    const checkAdmin = await User.findOne({ email });
    if (!checkAdmin) {
      res.status(404).json({ message: "User not exist!" });
    }
    const theRoom = await Room.findById(roomid);
    if (theRoom.admin.equals(checkAdmin._id)) {
      res.status(200).json(await Room.deleteOne({ _id: theRoom._id }));
    } else {
      res.status(401).json({
        message: "Unauthorized",
      });
    }
  } catch {
    res.status(500).json({
      message: "Something went wrong!",
    });
  }
};

module.exports.addBulkMember = async (req, res) => {
  try {
    const { semester, department, roomid } = req.body;
    let modifiedRoom = await Room.findById(roomid);
    if (!modifiedRoom) {
      res.status(404).json({ message: "Room not exist!" });
    } else {
      const filteredUsers = await User.find({ semester, department }).select(
        "_id"
      );
      if (!filteredUsers.length) {
        res.status(404).json({ message: "No such user found!" });
      } else {
        let userIDs = [
          ...filteredUsers.map(({ _id }) => _id),
          ...modifiedRoom.members,
        ];
        modifiedRoom.members = Array.from(new Set(userIDs));
        modifiedRoom = await modifiedRoom.save();
        await modifiedRoom.populate([
          {
            path: "members",
            select: "displayName email designation department -_id",
          },
          {
            path: "admin",
            select: "displayName email -_id",
          },
        ]);
        res.status(200).json({ ...modifiedRoom.toObject(), isJoined: true });
      }
    }
  } catch {
    res.status(500).json({
      message: "Something went wrong!",
    });
  }
};

module.exports.addMember = async (req, res) => {
  try {
    const { email, roomid } = req.body;
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
            await modifiedRoom.populate([
              {
                path: "members",
                select: "displayName email designation department -_id",
              },
              {
                path: "admin",
                select: "displayName email -_id",
              },
            ]);
            res
              .status(200)
              .json({ ...modifiedRoom.toObject(), isJoined: true });
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
        if (
          checkRoom.members.includes(checkUser._id) ||
          checkRoom.admin.equals(checkUser._id)
        ) {
          await checkRoom.populate([
            {
              path: "members",
              select: "displayName email designation department -_id",
            },
            {
              path: "admin",
              select: "displayName email -_id",
            },
            {
              path: "tasks",
              select: checkRoom.admin.equals(checkUser._id)
                ? "-__v -createdAt -room -updatedAt"
                : "-submission -__v -createdAt -room -updatedAt",
            },
          ]);
          res.status(200).json({ ...checkRoom.toObject(), isJoined: true });
        } else {
          res.status(200).json({
            roomName: checkRoom.roomName,
            courseTitle: checkRoom.courseTitle,
            courseCode: checkRoom.courseCode,
            admin: checkRoom.admin,
            isJoined: false,
          });
        }
      } else {
        res.status(404).json({
          message: "Room doesn't exist!",
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
};
