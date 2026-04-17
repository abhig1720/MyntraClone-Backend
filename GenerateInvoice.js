const PDFDocument = require('pdfkit');
const sendEmail = require('./SendEmail');
const fs = require('fs');
const path = require('path');
const OrderModel = require('./models/Order');

const generateInvoice = async (order) => {
  const populatedOrder = await OrderModel.populate(order, [
    { path: 'userId', select: 'name email' },
    { path: 'items.product', select: 'name price' }
  ]);
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, 'invoices', `invoice_${order._id}.pdf`);
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

       

        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.text(`Order ID: ${order._id}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
doc.text(`Customer: ${populatedOrder.userId?.name || 'Customer'} (${populatedOrder.userId?.email || ''})`);
        doc.moveDown();
        doc.fontSize(14).text('Order Items:');
        populatedOrder.items.forEach((item, index) => {
          doc.text(`${index + 1}. ${item.product?.name || 'N/A'} x${item.quantity} @₹${item.price?.toFixed(0)} = ₹${(item.price * item.quantity).toFixed(0)}`);
        });
        doc.moveDown();


        const subtotal = populatedOrder.totalAmount;
        const deliveryCharge = 50;
        const addonCharges = 0;
        const gstRate = 0.18;
        const gstAmount = subtotal * gstRate;
        const grandTotal = subtotal + deliveryCharge + addonCharges + gstAmount;
        doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`);
        doc.text(`Delivery Charge: ₹${deliveryCharge.toFixed(2)}`);
        doc.text(`Add-on Charges: ₹${addonCharges.toFixed(2)}`);
        doc.text(`GST (18%): ₹${gstAmount.toFixed(2)}`);
        doc.text(`Grand Total: ₹${grandTotal.toFixed(2)}`);
        doc.moveDown();

        doc.text('Thank you for shopping with us!', { align: 'center' });
        doc.end();

        stream.on('finish', () => {resolve(filePath)});
        stream.on('error', (err) => {reject(err)});

    
    });
}
module.exports = generateInvoice;
