require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// middleware
const corsOptions = {
  origin: ["http://localhost:5173", 'https://news-orbit-4f192.web.app'],
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
    const adminArticlesDecline = db.collection("decline");
    const premiumCollection = db.collection("premiums");

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

    // admin middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // FIXME: Publisher
    // post add Publisher
    app.post("/add-publisher", async (req, res) => {
      const publisher = req.body;
      const result = await publishersCollection.insertOne(publisher);
      res.send(result);
    });

    // get publisher data
    app.get("/publisher", verifyToken, async (req, res) => {
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
    app.get("/articles", verifyToken, verifyAdmin, async (req, res) => {
      const result = await articlesCollection.find().toArray();
      res.send(result);
    });


    // get articles data to email
    app.get('/user-articles/:email', async(req, res) => {
      const email = req.params.email
      const query = { 'userData.email': email };
      const result = await articlesCollection.find(query).toArray()
      res.send(result)
    })



    // get user approved data to id
    app.get("/userapproved/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.findOne(query);
      res.send(result);
    });


    // articles user delete api
    app.delete("/userDataDelete/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.deleteOne(query);
      res.send(result);
    });



    // FIXME: PREMIUM COLLECTION
    app.post("/premium", async (req, res) => {
      const premium = req.body;
      const result = await premiumCollection.insertOne(premium);
      res.send(result);
    });

    // get publisher data
    app.get("/premium", verifyToken, async (req, res) => {
      const result = await premiumCollection.find().toArray();
      res.send(result);
    });


    // get publisher data to id
    app.get("/premium/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await premiumCollection.findOne(query);
      res.send(result);
    });










     // articles delete api
     app.delete("/articles/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.deleteOne(query);
      res.send(result);
    });


    // articles decline reason box
    app.post("/articles-decline", async (req, res) => {
      const articles = req.body;
      const result = await adminArticlesDecline.insertOne(articles);
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
    app.get("/approved/:id",  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await adminApprovedCollection.findOne(query);
      res.send(result);
    });

   

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
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // admin check
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // user delete api
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // user role
    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
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
