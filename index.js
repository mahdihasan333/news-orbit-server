require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// middleware
const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qgrba.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("newsOrbit-project");
    const userCollection = db.collection("users");
    const publishersCollection = db.collection("publishers");
    const articlesCollection = db.collection("articles");
    const adminApprovedCollection = db.collection("approved");

    // FIXME:JWT TOKEN
    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // FIXME: middleware
    // middleware
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);

      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // FIXME: Publisher
    // post add Publisher
    app.post("/add-publisher", async (req, res) => {
      const publisher = req.body;
      const result = await publishersCollection.insertOne(publisher);
      res.send(result);
    });

    // get publisher data
    app.get("/publisher",  async (req, res) => {
      const result = await publishersCollection.find().toArray();
      res.send(result);
    });

    // FIXME: Articles
    // post add articles
    app.post("/add-articles", async (req, res) => {
      const articles = req.body;
      const result = await articlesCollection.insertOne(articles);
      res.send(result);
    });

    // get articles data
    app.get("/articles",  async (req, res) => {
      const result = await articlesCollection.find().toArray();
      res.send(result);
    });

    // FIXME: admin approved articles
    // post admin approved data
    app.post("/admin-approved", async (req, res) => {
      const approvedArticles = req.body;
      const result = await adminApprovedCollection.insertOne(approvedArticles);
      res.send(result);
    });

    // get admin approved data
    app.get("/approved-data", async (req, res) => {
      const result = await adminApprovedCollection.find().toArray();
      res.send(result);
    });

    // get admin approved data to id
    app.get("/approved/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await adminApprovedCollection.findOne(query);
      res.send(result);
    });

    // TODO: user email get route

    // FIXME: user relative api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get user api
    app.get("/users", verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // user delete api
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // user role
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("news orbit is server running!!!");
});

app.listen(port, () =>
  console.log(`news orbit  server is running on port ${port}`)
);
