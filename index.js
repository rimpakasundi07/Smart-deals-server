const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;
console.log(process.env);

// Middleware
app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
  console.log("logging information");
  next();
};

const verifyFireBaseToken = (req, res, next) => {
  console.log("in the verify middleware", req.headers.authorization);
  if (!req.headers.authorization) {
    // do not allow to go
  }

  //
  next();
};

// MongoDB Connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.obgikox.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Root Route
app.get("/", (req, res) => {
  res.send("Smart server is running");
});

// MAIN RUN FUNCTION (Only One)
async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("smart_db");
    const productsCollection = db.collection("products");
    const bidsCollection = db.collection("bids");
    const usersCollection = db.collection("users");

    // --------------------
    // Users API
    // --------------------
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;

      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.send({
          message: "User already exists. No need to insert again.",
        });
      }

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    // --------------------
    // Products API
    // --------------------

    // Get all products (with optional email filter)
    app.get("/products", async (req, res) => {
      const email = req.query.email;
      const query = {};

      if (email) query.email = email;

      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // Latest products (sorted)
    app.get("/latest-products", async (req, res) => {
      const result = await productsCollection
        .find()
        .sort({ created_at: -1 })
        .limit(9)
        .toArray();

      res.send(result);
    });

    // Single product
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // Add product
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    // Update product
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;

      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updatedProduct.name,
          price: updatedProduct.price,
        },
      };

      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });

    // Delete product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const result = await productsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    });

    // --------------------
    // Bids API
    // --------------------
    app.get("/bids", logger, verifyFireBaseToken, async (req, res) => {
      // console.log("headers", req.headers);
      const email = req.query.email;
      const query = {};

      if (email) query.buyer_email = email;

      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/products/bids/:productId", async (req, res) => {
      const productId = req.params.productId;
      const query = { product: productId };
      const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    });

    app.delete("/bids/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });

    // Ping for connection confirmation
    await client.db("admin").command({ ping: 1 });

    console.log("Pinged MongoDB! Database is ready.");
    app.listen(port, () => {
      console.log(`Smart server is running on port: ${port}`);
    });
  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);
