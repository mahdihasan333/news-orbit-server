require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    const db = client.db('newsOrbit-project')
    const publishersCollection = db.collection('publishers')
    const usersCollection = db.collection('users')

    // FIXME: Publisher 

    // post add Publisher
    app.post('/add-publisher', async(req, res) => {
      const publisher = req.body;
      const result = await publishersCollection.insertOne(publisher)
      res.send(result)
    })


    // get publisher data
    app.get('/publisher', async(req, res) => {
      const result = await publishersCollection.find().toArray()
      res.send()
    })






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
