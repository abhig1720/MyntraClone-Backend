const express = require('express');
const router = express.Router();
const Order = require('./models/Order');
const Cart = require('./models/Cart');
const sendEmail = require('./SendEmail');
const usersmodel = require('./models/users');
const generateInvoice = require('./GenerateInvoice');


router.post('/placeOrder', async (req, res) => {
  try {
    const { userId, address, paymentMethod, paymentIntentId } = req.body;
    if (paymentMethod === 'CARD') {
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment Intent ID required for CARD" });
      }
      
    }
    if (!userId || !address) {
      return res.status(400).json({ message: "userId and address required" });
    }

    const cart = await Cart.findOne({ userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const totalAmount = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    const order = new Order({
      userId,
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      })),
      address,
      paymentMethod: paymentMethod || 'COD',
      totalAmount,
      paymentIntentId: paymentIntentId || undefined,
      paymentStatus: 'succeeded'
    });

    await order.save();

   const user = await usersmodel.findById(userId);
   if(user && user.email){
    const invoicePath = await generateInvoice(order);
    await sendEmail(user.email, "Order Confirmation", `Your order #${order._id.toString().slice(-8)} has been placed successfully! Total: ₹${totalAmount.toLocaleString()}`
  [
    {
    filename:"invoice.pdf",
    path:invoicePath
  }
]
);
   }



    await Cart.updateOne({ userId }, { items: [] });

    res.status(201).json({ message: "Order placed successfully", orderId: order._id });
  } catch (error) {
    console.error("Place order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/', async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email phone')
      .populate('items.product', 'name price image')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/test-mail", async (req, res) => {
  try{
    await sendEmail(
      "abhig172003@gmail.com",
      "Test Email",
      "This is a test email from Myntra backend"
    );
  
  res.send("Test email sent");
  }


catch(error){
  console.error("Test email error:",error);
  res.status(500).send("Error sending test email");
}
});

router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('items.product', 'name price image');
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('userId', 'name email phone')
     .populate('items.product', 'name price image');

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

   if(order.userId && order.userId.email){
    await sendEmail(order.userId.email, "Order status updated", `your orders is now: ${status}`);

   }

    res.json({ message: "Status updated", order });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;

