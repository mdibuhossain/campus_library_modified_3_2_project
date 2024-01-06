const express = require("express");
const User = require("../Models/User_Model");
const Group = require("../Models/Group_Model");

const apiRouter = express.Router();

apiRouter.get("/", (req, res) => {
  res.send(
    `<h1 style="text-align:center;">Welcome to <em>Campus Classroom</em> API route</h1>`
  );
});

apiRouter.post("/classroom/create", async (req, res) => {
  const { roomName, courseTitle, courseCode, ui } = req.body;
  try {
    const savedGroup = await new Group({
      roomName: roomName,
      courseTitle: courseTitle,
      courseCode: courseCode,
      admin: uid,
    }).save();
    res.status(200).json(savedGroup);
  } catch {}
});

apiRouter.get("/classroom", async (req, res) => {
  const { uid } = req.body;
  try {
    const ownGroup = await Group.find({ admin: uid });
    const joinGroup = await Group.find({ members: uid });
    res.status(200).json({
      data: {
        myGroup: ownGroup,
        joinGroup: joinGroup,
      },
    });
  } catch {
    res.status(500).json({
      message: "Something went wrong!",
    });
  }
});

module.exports = apiRouter;
