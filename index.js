require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;
const app = express();

// middleware
const corsOptions = {
  origin: ["http://localhost:5173", "https://news-orbit-4f192.web.app"],
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
    const paymentCollection = db.collection("payments");

    // FIXME:JWT TOKEN
    // jwt related api
    // app.post("/jwt", async (req, res) => {
    //   const user = req.body;
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: "365d",
    //   });
    //   res.send({ token });
    // });

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      if (!user?.email) {
        return res.status(400).send({ message: "Email is required" });
      }
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    // premium jwt
    app.post("/premiumJwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1m",
      });
      res.send({ token });
    });

    // FIXME: middleware
    // middleware
    // const verifyToken = (req, res, next) => {
    //   if (!req.headers.authorization) {
    //     return res.status(401).send({ message: "unauthorized access" });
    //   }
    //   const token = req.headers.authorization.split(" ")[1];
    //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //     if (err) {
    //       return res.status(401).send({ message: "unauthorized access" });
    //     }
    //     req.decoded = decoded;
    //     next();
    //   });
    // };

    const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      const token = authHeader.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" });
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

    // // Premium User middleware
    // const verifyPremium = async (req, res, next) => {
    //   const authHeader = req.headers.authorization;
    //   if (!authHeader) {
    //     return res.status(401).send({ message: "Unauthorized access" });
    //   }
    //   const token = authHeader.split(" ")[1];
    //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //     if (err) {
    //       return res.status(401).send({ message: "Unauthorized access" });
    //     }
    //     req.decoded = decoded;
    //     next();
    //   });
    // };

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
    app.get("/articles", verifyToken, async (req, res) => {
      const result = await articlesCollection.find().toArray();
      res.send(result);
    });

    // get articles data to email
    app.get("/user-articles/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "userData.email": email };
      const result = await articlesCollection.find(query).toArray();
      res.send(result);
    });

    // get user approved data to id
    app.get("/userapproved/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articlesCollection.findOne(query);
      res.send(result);
    });

    // update user articles
    app.patch("/update/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          category: item.category,
          description: item.description,
          title: item.title,
          tags: item.tags,
          publisher: item.publisher,
        },
      };
      const result = await articlesCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // articles user delete api
    app.delete(
      "/userDataDelete/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await articlesCollection.deleteOne(query);
        res.send(result);
      }
    );

    // FIXME: PREMIUM COLLECTION
    app.post("/premium", async (req, res) => {
      const premium = req.body;
      const result = await premiumCollection.insertOne(premium);
      res.send(result);
    });

    // get premium data
    app.get("/premium", verifyToken, async (req, res) => {
      const result = await premiumCollection.find().toArray();
      res.send(result);
    });

    // get premium data to id
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
      const filter = req.query.filter;
      const search = req.query.search || "";
      let query = { title: { $regex: search, $options: "i" } };
      if (filter) query.publisher = filter;
      const result = await adminApprovedCollection.find(query).toArray();
      res.send(result);
    });


    // data for home
    app.get('/slider', async(req, res) => {
      const result = await adminApprovedCollection.find().limit(6).toArray();
      res.send(result)
    })

    // get admin approved data to id
    app.get("/approved/:id", async (req, res) => {
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
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

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
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    // premium role
    // app.patch("/users/premium/:email", verifyToken, async (req, res) => {
    //   const email = req.body.email;
    //   if(email !== req.decoded.email) {
    //     return res.status(403).send({ message: "forbidden access" });
    //   }
    //   const query = {email: email}
    //   const user = await userCollection.findOne(query)
    //   let premium = false
    //   if(user) {
    //     premium = user?.premium = 'Yes'
    //   }

    //   res.send({premium});
    // });

    // update user data
    app.patch("/update-user", async (req, res) => {
      const user = req.body;
      const email = req.params.email;
      console.log("email", email);
      const filter = { email };
      const updatedDoc = {
        $set: {
          name: user.name,
          image: user.imageUrl,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // FIXME: PAYMENT API
    // create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "amount inside the intent");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // PAYMENT POST
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      console.log("payment", payment);
      const paymentResult = await paymentCollection.insertOne(payment);
      console.log("paymentIntent", paymentResult);
      res.send({ paymentResult });
    });

    //  PAYMENT GET ROUTE
    app.get("/payments", verifyToken, async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });

    // admin stat
    app.get("/admin-stat", verifyToken, async (req, res) => {
      const totalUser = await userCollection.estimatedDocumentCount();
      res.send({totalUser});
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
