const express = require("express");
const User = require("../Models/User_Model");
const Group = require("../Models/Room_Model");
const classroomController = require("../controllers/classroomController");

const apiRouter = express.Router();

apiRouter.get("/", (req, res) => {
  res.send(
    `<h1 style="text-align:center;">Welcome to <em>Campus Classroom</em> API route</h1>`
  );
});

apiRouter.post("/classroom/create", classroomController.createClassroom);

apiRouter.post("/classroom/addmember", classroomController.addMember);

apiRouter.get("/classroom", classroomController.getRooms);

module.exports = apiRouter;
