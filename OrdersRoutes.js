const express = require('express');
const router = express.Router();
const Order = require('./models/Order');
const Cart = require('./models/Cart');
const sendEmail = require('./SendEmail');
const usersmodel = require('./models/users');
const generateInvoice = require('./GenerateInvoice');

// ── HTML Templates ────────────────────────────────────────────
const orderConfirmationHtml = (user, order, totalAmount) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
    <div style="background:#282c3f;padding:20px 24px;">
      <h1 style="color:#ff3f6c;margin:0;font-size:22px;">MYNTRA CLONE</h1>
    </div>
    <div style="padding:24px;">
      <h2 style="color:#282c3f;">Order Confirmed! 🎉</h2>
      <p>Hi <strong>${user.name || 'Customer'}</strong>,</p>
      <p>Thank you for your order. Your order has been placed successfully.</p>

      <table width="100%" cellpadding="8" style="border-collapse:collapse;margin:16px 0;">
        <tr style="background:#282c3f;color:#fff;">
          <th align="left">Order ID</th>
          <th align="left">Payment</th>
          <th align="right">Total</th>
        </tr>
        <tr style="background:#f9f9f9;">
          <td>#${order._id.toString().slice(-8).toUpperCase()}</td>
          <td>${order.paymentMethod || 'COD'}</td>
          <td align="right"><strong>₹${totalAmount.toLocaleString()}</strong></td>
        </tr>
      </table>

      <table width="100%" cellpadding="8" style="border-collapse:collapse;margin:16px 0;">
        <tr style="background:#282c3f;color:#fff;">
          <th align="left">Product</th>
          <th align="right">Qty</th>
          <th align="right">Price</th>
        </tr>
        ${order.items.map((item, i) => `
          <tr style="background:${i % 2 === 0 ? '#fafafa' : '#fff'};">
            <td>${item.product?.name || item.name || 'Product'}</td>
            <td align="right">${item.quantity}</td>
            <td align="right">₹${(item.price * item.quantity).toLocaleString()}</td>
          </tr>
        `).join('')}
      </table>

      <p><strong>Delivery Address:</strong> ${order.address || 'N/A'}</p>
      <p style="color:#888;font-size:12px;">
        Your invoice is attached to this email.<br/>
        We will notify you when your order status changes.
      </p>
    </div>
    <div style="background:#f5f6f7;padding:12px 24px;text-align:center;color:#888;font-size:12px;">
      © Myntra Clone &nbsp;|&nbsp; Easy returns within 30 days
    </div>
  </div>
`;

const orderStatusHtml = (user, order) => {
  const statusColors = {
    pending: '#f0ad4e',
    confirmed: '#5bc0de',
    shipped: '#337ab7',
    delivered: '#5cb85c',
    cancelled: '#d9534f',
  };
  const badgeColor = statusColors[order.status?.toLowerCase()] || '#aaa';

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <div style="background:#282c3f;padding:20px 24px;">
        <h1 style="color:#ff3f6c;margin:0;font-size:22px;">MYNTRA CLONE</h1>
      </div>
      <div style="padding:24px;">
        <h2 style="color:#282c3f;">Order Status Updated</h2>
        <p>Hi <strong>${user.name || 'Customer'}</strong>,</p>
        <p>Your order status has been updated:</p>

        <table width="100%" cellpadding="10" style="border-collapse:collapse;background:#f9f9f9;margin:16px 0;">
          <tr>
            <td><strong>Order ID:</strong></td>
            <td>#${order._id.toString().slice(-8).toUpperCase()}</td>
          </tr>
          <tr>
            <td><strong>New Status:</strong></td>
            <td>
              <span style="background:${badgeColor};color:#fff;padding:4px 12px;border-radius:4px;font-size:13px;">
                ${order.status.toUpperCase()}
              </span>
            </td>
          </tr>
          <tr>
            <td><strong>Total Amount:</strong></td>
            <td>₹${Number(order.totalAmount).toLocaleString()}</td>
          </tr>
        </table>

        <p style="color:#888;font-size:12px;">
          If you have any questions, contact our support team.
        </p>
      </div>
      <div style="background:#f5f6f7;padding:12px 24px;text-align:center;color:#888;font-size:12px;">
        © Myntra Clone &nbsp;|&nbsp; Easy returns within 30 days
      </div>
    </div>
  `;
};

// ── POST /orders/placeOrder ───────────────────────────────────
router.post('/placeOrder', async (req, res) => {
  try {
    const { userId, address, paymentMethod, paymentIntentId } = req.body;

    if (paymentMethod === 'CARD' && !paymentIntentId) {
      return res.status(400).json({ message: "Payment Intent ID required for CARD" });
    }
    if (!userId || !address) {
      return res.status(400).json({ message: "userId and address required" });
    }

    const cart = await Cart.findOne({ userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + (item.product.price * item.quantity), 0
    );

    const order = new Order({
      userId,
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
        name: item.product.name,       // ✅ store name for invoice
      })),
      address,
      paymentMethod: paymentMethod || 'COD',
      totalAmount,
      paymentIntentId: paymentIntentId || undefined,
      paymentStatus: 'succeeded',
    });

    await order.save();

    // ── Send confirmation email + invoice ─────────────────────
    const user = await usersmodel.findById(userId);
    if (user?.email) {
      try {
        // Populate product names for invoice
        const populatedOrder = await Order.findById(order._id)
          .populate('items.product', 'name price');

        let attachments = [];
        try {
          const invoiceBuffer = await generateInvoice(populatedOrder);
          attachments = [{
            filename: `invoice_${order._id}.pdf`,
            content: invoiceBuffer,          // ✅ Nodemailer uses raw buffer
            contentType: 'application/pdf',
          }];
        } catch (invoiceErr) {
          console.error("Invoice generation error:", invoiceErr);
        }

        await sendEmail(
          user.email,
          `Order Confirmed - #${order._id.toString().slice(-8).toUpperCase()}`,
          orderConfirmationHtml(user, populatedOrder, totalAmount),
          attachments
        );

      } catch (emailErr) {
        console.error("Order confirmation email error:", emailErr);
      }
    }

    await Cart.updateOne({ userId }, { items: [] });
    res.status(201).json({ message: "Order placed successfully", orderId: order._id });

  } catch (error) {
    console.error("Place order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /orders (admin) ───────────────────────────────────────
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

// ── GET /orders/test-mail ─────────────────────────────────────
router.get('/test-mail', async (req, res) => {
  try {
    await sendEmail(
      process.env.TEST_MAIL_TO || process.env.EMAIL_USER,
      "Test Email - Myntra Clone",
      `<div style="font-family:Arial,sans-serif;padding:20px;">
        <h2 style="color:#ff3f6c;">Myntra Clone</h2>
        <p>This is a test email. Your email setup is working correctly! ✅</p>
      </div>`
    );
    res.json({ ok: true, message: "Test email sent" });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({ ok: false, message: "Error sending test email", detail: error.message });
  }
});

// ── GET /orders/:id ───────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('items.product', 'name price image');
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /orders/:id/status (admin) ────────────────────────────
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const existing = await Order.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Order not found" });

    const previousStatus = existing.status;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('userId', 'name email phone')
      .populate('items.product', 'name price image');

    // ── Send status update email ──────────────────────────────
    if (previousStatus !== status && order.userId?.email) {
      try {
        await sendEmail(
          order.userId.email,
          `Order Update - #${order._id.toString().slice(-8).toUpperCase()} is now "${status}"`,
          orderStatusHtml(order.userId, order)
        );
      } catch (emailErr) {
        console.error("Order status email error:", emailErr);
      }
    }

    res.json({ message: "Status updated", order });

  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;