const express = require("express");
const User = require("../Models/User_Model");
const Group = require("../Models/Room_Model");
const classroomController = require("../controllers/classroomController");
const taskController = require("../controllers/taskController");
const submissionController = require("../controllers/submissionController");
const upload = require("../MiddleWare/multer.middleware");

const apiRouter = express.Router();

apiRouter.get("/", (req, res) => {
  res.send(
    `<h1 style="text-align:center;">Welcome to <em>Campus Classroom</em> API route</h1>`
  );
});

apiRouter.post("/classroom/create", classroomController.createClassroom);
apiRouter.post("/classroom/addmember", classroomController.addMember);
apiRouter.post("/classroom/addmember/bulk", classroomController.addBulkMember);
apiRouter.post("/classroom/delete", classroomController.deleteClassroom);
apiRouter.get("/classroom", classroomController.getRooms);
apiRouter.get("/classroom/:roomid", classroomController.getRoomDetails);
apiRouter.get("/material", classroomController.getMaterial);

apiRouter.post("/task/create", taskController.createTask);

apiRouter.post("/task/:taskid/submit", upload.single("assignment"), submissionController.submitTask)
apiRouter.patch("/task/unsubmit/:submissionid", submissionController.unSubmitTask)

module.exports = apiRouter;
