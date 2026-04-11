const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: "rzp_test_SZ2hDFf0RO3e6M",
  key_secret: "OUUFzp5NwvkFtA1L0g9z2Iqo",
});
router.post("/create-order", async (req, res) => {
  try {
    const amount = req.body.amount;

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_order_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating order");
  }
});
module.exports = router;
