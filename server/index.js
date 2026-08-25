const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5001;
const { graphqlHTTP } = require("express-graphql");
const { connectDB } = require("./Config/db");
const schema = require("./Schema/schema");
const admin = require("firebase-admin");
const path = require("path");
const { graphqlUploadExpress } = require("graphql-upload");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const PUBLIC_STATIC = path.join(__dirname, 'public')
const app = express();

connectDB();
app.use(cors());
// must run before graphqlHTTP so multipart uploads become Upload promises
app.use(graphqlUploadExpress());
app.use(express.json());
app.use(express.static(PUBLIC_STATIC));

app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    graphiql: process.env.NODE_ENV === "development",
  })
);

app.use((err, req, res, next) => {
  if (err) {
    res.status(500).send(err.message)
  } else {
    res.send("success")
  }
})

app.listen(port, () => console.log(`Server running on ${port}`));
