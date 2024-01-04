const express = require("express")

const apiRouter = express.Router();

apiRouter.get("/", (req, res) => {
    res.send(`<h1 style="text-align:center;">Welcome to <em>Campus Classroom</em> API route</h1>`)
})

module.exports = apiRouter;