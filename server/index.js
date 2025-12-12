const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5001;
const { graphqlHTTP } = require("express-graphql");
const { connectDB } = require("./Config/db");
const schema = require("./Schema/schema");
const admin = require("firebase-admin");
const path = require("path");
const apiRouter = require("./routes/api");
const multer = require("multer");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const PUBLIC_STATIC = path.join(__dirname, 'public')
const app = express();

connectDB();
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_STATIC));

app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    graphiql: process.env.NODE_ENV === "development",
  })
);

app.use("/api", apiRouter);

app.use((err, req, res, next) => {
  if (err) {
    if (err instanceof multer.MulterError) {
      res.status(500).send("There was an upload error!")
    } else {
      res.status(500).send(err.message)
    }
  } else {
    res.send("success")
  }
})

app.listen(port, () => console.log(`Server running on ${port}`));
