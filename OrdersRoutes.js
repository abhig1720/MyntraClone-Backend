const express = require('express');
const router = express.Router();

const Order = require('./models/Order');
const Cart = require('./models/Cart');
const usersmodel = require('./models/users');

const { sendEmail } = require('./SendEmail');
const generateInvoice = require('./GenerateInvoice');


// PLACE ORDER
router.post('/placeOrder', async (req, res) => {
  try {

    const {
      userId,
      address,
      paymentMethod,
      paymentIntentId
    } = req.body;

    if (paymentMethod === 'CARD' && !paymentIntentId) {
      return res.status(400).json({
        message: "Payment Intent ID required for CARD"
      });
    }

    if (!userId || !address) {
      return res.status(400).json({
        message: "userId and address required"
      });
    }

    const cart = await Cart.findOne({ userId })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty"
      });
    }

    const totalAmount = cart.items.reduce(
      (sum, item) =>
        sum + (item.product.price * item.quantity),
      0
    );

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

      paymentIntentId:
        paymentIntentId || undefined,

      paymentStatus: 'succeeded'
    });

    await order.save();

    // GET USER
    const user = await usersmodel.findById(userId);

    // SEND EMAIL
    if (user && user.email) {

      const subject =
        "Order Confirmation - Myntra Clone";

      const htmlContent = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">

          <h1 style="color:#ff3f6c;">
            MYNTRA CLONE
          </h1>

          <h2>
            Order Confirmed ✅
          </h2>

          <p>
            Hello
            <strong>
              ${user.name || "Customer"}
            </strong>,
          </p>

          <p>
            Your order has been placed successfully.
          </p>

          <hr/>

          <h3>Order Details</h3>

          <p>
            <strong>Order ID:</strong>
            ${order._id}
          </p>

          <p>
            <strong>Total Amount:</strong>
            ₹${totalAmount}
          </p>

          <p>
            <strong>Payment Method:</strong>
            ${paymentMethod || "COD"}
          </p>

          <hr/>

          <p>
            Thank you for shopping with us ❤️
          </p>

        </div>
      `;

      try {

        console.log("EMAIL FUNCTION CALLED");

        let invoiceBuffer = null;

        // GENERATE PDF
        try {

          invoiceBuffer =
            await generateInvoice(order);

        } catch (invoiceErr) {

          console.error(
            "Invoice generation error:",
            invoiceErr
          );

        }

        // SEND WITH PDF
        if (invoiceBuffer) {

          const attachments = [
            {
              filename:
                `invoice_${order._id}.pdf`,
              content: invoiceBuffer
            }
          ];

          await sendEmail(
            "abhig172003@gmail.com",
            subject,
            htmlContent,
            attachments
          );

        } else {

          // SEND WITHOUT PDF
          await sendEmail(
            "abhig172003@gmail.com",
            subject,
            htmlContent
          );

        }

        console.log(
          "EMAIL SENT SUCCESSFULLY"
        );

      } catch (emailErr) {

        console.error(
          "Order confirmation email error:",
          emailErr
        );

      }
    }

    // CLEAR CART
    await Cart.updateOne(
      { userId },
      { items: [] }
    );

    res.status(201).json({
      success: true,
      message:
        "Order placed successfully",
      orderId: order._id
    });

  } catch (error) {

    console.error(
      "Place order error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
});


// GET ALL ORDERS
router.get('/', async (req, res) => {

  try {

    const orders = await Order.find()

      .populate(
        'userId',
        'name email phone'
      )

      .populate(
        'items.product',
        'name price image'
      )

      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {

    console.error(
      "Get orders error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });

  }
});


// GET SINGLE ORDER
router.get('/:id', async (req, res) => {

  try {

    const order = await Order.findById(
      req.params.id
    )

      .populate(
        'userId',
        'name email phone'
      )

      .populate(
        'items.product',
        'name price image'
      );

    if (!order) {

      return res.status(404).json({
        message: "Order not found"
      });

    }

    res.json(order);

  } catch (error) {

    console.error(
      "Get order error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });

  }
});


// UPDATE ORDER STATUS
router.put('/:id/status', async (req, res) => {

  try {

    const { status } = req.body;

    const allowedStatuses = [
      'pending',
      'confirmed',
      'shipped',
      'delivered',
      'cancelled'
    ];

    if (
      !allowedStatuses.includes(status)
    ) {

      return res.status(400).json({
        message: "Invalid status"
      });

    }

    const order =
      await Order.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      )

        .populate(
          'userId',
          'name email phone'
        )

        .populate(
          'items.product',
          'name price image'
        );

    if (!order) {

      return res.status(404).json({
        message: "Order not found"
      });

    }

    // SEND STATUS EMAIL
    if (
      order.userId &&
      order.userId.email
    ) {

      try {

        await sendEmail(

          "abhig172003@gmail.com",

          `Order Status Updated - ${status}`,

          `
          <div style="font-family:Arial;padding:20px;">

            <h2>
              Order Status Updated
            </h2>

            <p>
              Hello
              ${order.userId.name},
            </p>

            <p>
              Your order status is now:
            </p>

            <h3 style="color:#ff3f6c;">
              ${status.toUpperCase()}
            </h3>

            <p>
              Thank you for shopping
              with Myntra Clone ❤️
            </p>

          </div>
          `
        );

      } catch (emailErr) {

        console.error(
          "Status email error:",
          emailErr
        );

      }
    }

    res.json({
      message:
        "Status updated successfully",
      order
    });

  } catch (error) {

    console.error(
      "Update status error:",
      error
    );

    res.status(500).json({
      message: "Server error"
    });

  }
});


// TEST EMAIL
router.get('/test-mail', async (req, res) => {

  try {

    await sendEmail(

      "abhig172003@gmail.com",

      "Test Email",

      `
      <h1>
        Email Working Successfully ✅
      </h1>
      `
    );

    res.json({
      ok: true,
      message:
        "Test email sent successfully"
    });

  } catch (error) {

    console.error(
      "Test email error:",
      error
    );

    res.status(500).json({
      ok: false,
      message:
        "Error sending email",
      detail: error.message
    });

  }
});


module.exports = router;