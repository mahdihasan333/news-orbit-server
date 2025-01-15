require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
    res.send("news orbit is server running!!!");
  });
  
  app.listen(port, () => console.log(`news orbit  server is running on port ${port}`));
  