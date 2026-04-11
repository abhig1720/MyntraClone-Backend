const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const usersmodel = require("./models/users");
const productsRoutes = require("./ProductsRoutes");
const userRoutes = require("./UserRoutes");
const cartRoutes = require("./CartRoutes");
const ordersRoutes = require("./OrdersRoutes");
const dotenv = require("dotenv");
dotenv.config({ quiet: true });
const paymentRoutes = require("./PaymentRoutes");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/products", productsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/users", userRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", ordersRoutes);



app.get("/", (req, res) => {
  res.send("Myntra Clone Backend");
});

app.post("/signup", async (req, res) => {
  try {
    const { name, phone, email, password, confirmPassword } = req.body;

    if (!name || !phone || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "Please fill all details" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (phone.length !== 10) {
      return res.status(400).json({ message: "Please enter a valid 10-digit phone number" });
    }

    const existingUser = await usersmodel.findOne({ 
      $or: [{ email: email }, { phone: phone }] 
    });

    if (existingUser) {
      return res.status(400).json({ message: "User with this email or phone already exists" });
    }
    const newUser = new usersmodel({
      name,
      phone,
      email,
      password,
      confirmPassword
    });

    await newUser.save();
    await newUser.save();
    res.status(201).json({ message: "Signup successful", user: { _id: newUser._id, name, email, phone } });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { loginInput, password } = req.body;

    if (!loginInput || !password) {
      return res.status(400).json({ message: "Please enter email/mobile and password" });
    }

    const user = await usersmodel.findOne({
      $or: [{ email: loginInput }, { phone: loginInput }]
    });

    if (!user) {
      return res.status(400).json({ message: "User not found. Please signup first." });
    }

    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid password" });
    }

    res.status(200).json({ 
      message: "Login successful", 
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone } 
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

mongoose.connect(process.env.MONGO_URl)
  .then(() => console.log("MongoDB ATlas  Connected "))
  .catch((err) => console.log(err));

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
