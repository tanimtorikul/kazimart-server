const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o2yungw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Routes
async function run() {
  try {
    // await client.connect();
    const productsCollection = client.db("kazimartDB").collection("products");
    const usersCollection = client.db("kazimartDB").collection("users");
    const cartsCollection = client.db("kazimartDB").collection("carts");
    const bannersCollection = client.db("kazimartDB").collection("mainbanners");
    const promoCollection = client.db("kazimartDB").collection("promo");
    const categoriesCollection = client
      .db("kazimartDB")
      .collection("categories");
    const ordersCollection = client.db("kazimartDB").collection("orders");
    const blogsCollection = client.db("kazimartDB").collection("blogs");

    // jwt related apis
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // middlewares
    const verifyToken = (req, res, next) => {
      console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // api to get all users - protected route
    app.get("/users", verifyToken, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    // api to check admin
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // api to add a user and check is exist
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // api to update user role to admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // api to get all categories
    app.get("/categories", async (req, res) => {
      const categories = await categoriesCollection.find().toArray();
      res.send(categories);
    });
    // api to post categories
    app.post("/categories", async (req, res) => {
      const category = req.body;
      const result = await categoriesCollection.insertOne(category);
      res.send(result);
    });
    // api to delete categories
    app.delete("/categories/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await categoriesCollection.deleteOne(query);

      res.send(result);
    });
    // api to get all products
    app.get("/products/all", async (req, res) => {
      const products = await productsCollection.find().toArray();
      res.send(products);
    });

    // api to get products based on params
    app.get("/products", async (req, res) => {
      // console.log('pagination query',req.query);
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const filter = req.query;
      const query = {
        $or: [
          { name: { $regex: filter.search, $options: "i" } },
          { description: { $regex: filter.search, $options: "i" } },
        ],
      };

      const options = {
        sort: {
          price: filter.sort === "asc" ? 1 : -1,
        },
      };

      const products = await productsCollection
        .find(query, options)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(products);
    });
    // by id
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const product = await productsCollection.findOne({
        _id: new ObjectId(id),
      });
      if (product) {
        res.json(product);
      } else {
        res.status(404).send("Product not found");
      }
    });

    //pagination
    app.get("/productsCount", async (req, res) => {
      const count = await productsCollection.estimatedDocumentCount();
      res.send({ count });
    });
    // api to post product
    app.post("/products", verifyToken, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    // api to update category
    app.put("/categories/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const updatedCategory = req.body;

      const result = await categoriesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedCategory }
      );

      res.send(result);
    });
    // api to update product
    app.put("/products/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const productData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: productData,
      };
      const result = await productsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // api to delete product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });
    // api to get all main banners
    app.get("/main-banners", async (req, res) => {
      const banners = await bannersCollection.find().toArray();
      res.send(banners);
    });
    // api to post main banner
    app.post("/main-banners", async (req, res) => {
      const banner = req.body;
      const result = await bannersCollection.insertOne(banner);
      res.send(result);
    });

    app.delete("/main-banners/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bannersCollection.deleteOne(query);

      res.send(result);
    });
    // api to get all promo banners
    app.get("/promo", async (req, res) => {
      const promo = await promoCollection.find().toArray();
      res.send(promo);
    });

    // api to get cart items by user email
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    // api to add cart items
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
    });

    // API to update cart items
    app.patch("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const result = await cartsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      res.send(result);
    });

    // API to delete a user by ID
    app.delete("/users/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);

      res.send(result);
    });

    //api to delete cart item
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.deleteMany(query);
      res.send(result);
    });

    // api to post orders
    app.post("/allorders", async (req, res) => {
      const orderItem = req.body;
      const result = await ordersCollection.insertOne(orderItem);
      res.send(result);
    });

    // api to get orders
    app.get("/allorders", verifyToken, async (req, res) => {
      const orders = await ordersCollection.find().toArray();
      res.send(orders);
    });
    // api to get orders based on search , filter, and pagination
    app.get("/orders", async (req, res) => {
      // console.log('pagination query',req.query);
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const filter = req.query;
      const query = {
        $or: [
          { name: { $regex: filter.search, $options: "i" } },
          { _id: { $regex: filter.search, $options: "i" } },
        ],
      };

      const orders = await ordersCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(orders);
    });

    //pagination
    app.get("/ordersCount", async (req, res) => {
      const count = await ordersCollection.estimatedDocumentCount();
      res.send({ count });
    });
    // api to get orders by user email
    app.get("/allorders/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    // api  to update order status
    app.patch("/allorders/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;

      const result = await ordersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      res.send(result);
    });
    // api to add blogs
    app.post("/add-blogs", async (req, res) => {
      const blog = req.body;
      const result = await blogsCollection.insertOne(blog);
      res.send(result);
    });
    // api to get blogs
    app.get("/get-blogs", async (req, res) => {
      const blog = await blogsCollection.find().toArray();
      res.send(blog);
    });

    // // **Ping MongoDB**
    // await client.db("admin").command({ ping: 1 });
    // console.log("Successfully connected to MongoDB.");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

// Root Route
app.get("/", (req, res) => {
  res.send("Kazimart server is running");
});

// Server Start
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
