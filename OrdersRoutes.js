const express = require('express');
const router = express.Router();
const Order = require('./models/Order');
const Cart = require('./models/Cart');
const sendEmail = require('./SendEmail');
const { Resend } = require('resend');
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
    if (user && user.email) {
      const subject = "Order Confirmation - Myntra Clone";
      const htmlContent = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
          <div style="background: linear-gradient(135deg, #ff3f6c, #ff6b8b); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">MYNTRA CLONE</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your order has been confirmed!</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #333333; line-height: 1.6; margin-bottom: 25px;">
              Hi <strong style="color: #111;">${user.name || "there"}</strong>,
            </p>
            <p style="font-size: 16px; color: #555555; line-height: 1.6; margin-bottom: 30px;">
              Thank you for shopping with us! We're thrilled to confirm your recent order. We're getting everything ready, and we'll let you know as soon as it ships.
            </p>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #ff3f6c;">
              <h3 style="margin-top: 0; color: #111; font-size: 18px; margin-bottom: 15px;">Order Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Order ID:</td>
                  <td style="padding: 8px 0; color: #111; font-weight: 600; text-align: right;">#${order._id.toString().slice(-8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Total Amount:</td>
                  <td style="padding: 8px 0; color: #ff3f6c; font-weight: 700; text-align: right; font-size: 18px;">₹${totalAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; border-bottom: none;">Payment Method:</td>
                  <td style="padding: 8px 0; color: #111; font-weight: 600; text-align: right; border-bottom: none;">${order.paymentMethod || "COD"}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #777777; line-height: 1.6; text-align: center; margin-top: 40px;">
              Your invoice is attached to this email.<br/>
              If you have any questions, simply reply to this email.
            </p>
          </div>
          
          <div style="background-color: #fcfcfc; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
            <p style="font-size: 12px; color: #999999; margin: 0;">
              © ${new Date().getFullYear()} Myntra Clone. All rights reserved.<br/>
              Fashion Street, Koramangala, Bengaluru
            </p>
          </div>
        </div>
      `;
      try {
        let invoiceBuffer = null;
        try {
          invoiceBuffer = await generateInvoice(order);
        } catch (invoiceErr) {
          console.error("Invoice generation error:", invoiceErr);
        }
        if (invoiceBuffer) {
          const attachments = [
            {
              filename: `invoice_${order._id}.pdf`,
              content: invoiceBuffer
            }
          ];

          console.log("EMAIL FUNCTION CALLED");
          await sendEmail(user.email, subject, htmlContent, attachments);
        } else {
          await sendEmail(user.email, subject, htmlContent);
        }
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
  try {
    await sendEmail(
      process.env.TEST_MAIL_TO || "abhig172003@gmail.com",
      "Test email",
      "This is a test email from the Myntra clone backend."
    );
    res.json({ ok: true, message: "Test email sent" });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      ok: false,
      message: "Error sending test email",
      detail: error.message
    });
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

    const existing = await Order.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Order not found" });
    }
    const previousStatus = existing.status;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('userId', 'name email phone')
      .populate('items.product', 'name price image');

    const statusChanged = previousStatus !== status;
    if (statusChanged && order.userId && order.userId.email) {
      const customerName = order.userId.name || "there";
      const subject = `Update on your Order #${order._id.toString().slice(-8).toUpperCase()} - Myntra Clone`;

      const statusColors = {
        'pending': '#f59e0b',
        'confirmed': '#3b82f6',
        'shipped': '#8b5cf6',
        'delivered': '#10b981',
        'cancelled': '#ef4444'
      };
      const statusColor = statusColors[status] || '#ff3f6c';

      const htmlContent = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
          <div style="background: linear-gradient(135deg, ${statusColor}, ${statusColor}dd); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">MYNTRA CLONE</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Order Status Update</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #333333; line-height: 1.6; margin-bottom: 25px;">
              Hi <strong style="color: #111;">${customerName}</strong>,
            </p>
            <p style="font-size: 16px; color: #555555; line-height: 1.6; margin-bottom: 30px;">
              There is an update regarding your order <strong>#${order._id.toString().slice(-8).toUpperCase()}</strong>.
            </p>
            
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin-bottom: 30px; border-left: 4px solid ${statusColor}; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Current Status</p>
              <h2 style="margin: 10px 0 0 0; color: ${statusColor}; font-size: 28px; text-transform: capitalize;">${status}</h2>
            </div>

            <p style="font-size: 14px; color: #777777; line-height: 1.6; text-align: center; margin-top: 40px;">
              Thank you for shopping with us!<br/>
              If you have any questions, simply reply to this email.
            </p>
          </div>
          
          <div style="background-color: #fcfcfc; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
            <p style="font-size: 12px; color: #999999; margin: 0;">
              © ${new Date().getFullYear()} Myntra Clone. All rights reserved.
            </p>
          </div>
        </div>
      `;

      try {
        await sendEmail(order.userId.email, subject, htmlContent);
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

