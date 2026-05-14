const express = require('express');
const router = express.Router();
const { buildInvoice } = require('../utils/generatePdf');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { Resend } = require('resend');
const { protect } = require('../middleware/auth');




router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized. Valid user ID required.' } });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'No order items' } });
    }


    let calculatedTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, error: { message: `Product not found: ${item.name}` } });
      }


      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, error: { message: `Insufficient stock for ${product.name}` } });
      }


      verifiedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        imageUrl: product.imageUrl
      });

      calculatedTotal += (product.price * item.quantity);




    }

    const order = new Order({
      userId: userId || null,
      items: verifiedItems,
      shippingAddress,
      paymentMethod,
      totalPrice: calculatedTotal
    });

    const savedOrder = await order.save();

    // --- Send Order Confirmation Email with PDF Invoice via Resend ---
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY missing, skipping order confirmation email');
      } else {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const user = await User.findById(userId).select('email name');
        if (user && user.email) {
          const itemsHtml = verifiedItems.map(item => `
            <tr>
              <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
              <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
              <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${(item.price * item.quantity).toFixed(2)}</td>
            </tr>`).join('');

          // Generate PDF invoice as a Buffer
          const invoiceNo = `INV-2026-${savedOrder._id.toString().substring(0, 6).toUpperCase()}`;
          const pdfBuffer = await buildInvoice(savedOrder);

          await resend.emails.send({
            from: 'Walmart Clone <onboarding@resend.dev>',
            to: user.email,
            subject: `Order Confirmed! #${savedOrder._id.toString().slice(-6).toUpperCase()}`,
            html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#0071ce;">🛒 Order Confirmed!</h2>
              <p>Hi <strong>${user.name || 'Valued Customer'}</strong>,</p>
              <p>Thank you for your order. Here's a summary:</p>

              <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                <thead>
                  <tr style="background:#f5f5f5;">
                    <th style="padding:8px;text-align:left;">Product</th>
                    <th style="padding:8px;text-align:center;">Qty</th>
                    <th style="padding:8px;text-align:right;">Price</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>

              <p style="text-align:right;font-size:18px;">
                <strong>Total: $${calculatedTotal.toFixed(2)}</strong>
              </p>

              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/>
              <p style="color:#666;font-size:13px;">
                <strong>Shipping to:</strong><br/>
                ${shippingAddress.street || ''}, ${shippingAddress.city || ''}, ${shippingAddress.zip || ''}
              </p>
              <p style="color:#555;font-size:13px;">🧾 Your official receipt is attached to this email.</p>
              <p style="color:#999;font-size:12px;">Order ID: ${savedOrder._id}</p>
            </div>
          `,
            attachments: [
              {
                filename: `Walmart-Invoice-${invoiceNo}.pdf`,
                content: pdfBuffer,
              }
            ]
          });
        }
      }
    } catch (emailError) {
      console.warn('Order confirmation email failed (non-critical):', emailError.message);
    }
    // --- End Email ---

    res.status(201).json({
      success: true,
      data: {
        order: savedOrder
      }
    });


  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Error creating order: ' + error.message,
      },
    });
  }
});




router.get('/myorders', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Error fetching orders',
      },
    });
  }
});


router.get('/', async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Error fetching all orders' } });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ success: false, error: { message: 'Order not found' } });
    res.status(200).json({ success: true, data: { order } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Error updating order' } });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: { message: 'Order not found' } });
    res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Error deleting order' } });
  }
});

// @desc    Email Order Invoice PDF as Attachment
// @route   GET /api/orders/:id/invoice
// @access  Private
router.get('/:id/invoice', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: { message: 'Order not found' } });
    }

    // Make sure standard users can only request their own invoices
    if (order.userId && order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized to access this invoice' } });
    }

    const user = await User.findById(req.user.id).select('email name');
    if (!user || !user.email) {
      return res.status(404).json({ success: false, error: { message: 'User email not found' } });
    }

    // Generate the PDF as a Buffer
    const pdfBuffer = await buildInvoice(order);

    // Send the PDF buffer as an email attachment
    const { sendEmail } = require('../utils/send-email');
    const invoiceNo = `INV-2026-${order._id.toString().substring(0, 6).toUpperCase()}`;
    await sendEmail(
      user.email,
      `Your Walmart Clone Receipt - ${invoiceNo}`,
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#0071ce;">🧾 Your Invoice is Attached!</h2>
        <p>Hi <strong>${user.name || 'Valued Customer'}</strong>,</p>
        <p>Please find your official receipt for order <strong>#${order._id.toString().slice(-6).toUpperCase()}</strong> attached to this email.</p>
        <p style="color:#555;">Thank you for shopping with Walmart Clone!</p>
      </div>`,
      [
        {
          filename: `Walmart-Invoice-${invoiceNo}.pdf`,
          content: pdfBuffer,
        }
      ]
    );

    res.status(200).json({ success: true, message: 'Invoice sent to your email successfully!' });

  } catch (error) {
    console.error('Error emailing PDF invoice:', error);
    res.status(500).json({ success: false, error: { message: 'Server error emailing invoice' } });
  }
});

module.exports = router;
