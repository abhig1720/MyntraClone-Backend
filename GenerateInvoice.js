const PDFDocument = require('pdfkit');
const sendEmail = require('./SendEmail');
const fs = require('fs');
const path = require('path');

const generateInvoice = async (order) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, 'invoices', `invoice_${order._id}.pdf`);
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

       

        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.text(`Order ID: ${order._id}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Customer: ${order.name}`);
        doc.moveDown();


        const gst =order.totalPrice * 0.18;
        doc.text(`Total Price: ₹${order.totalPrice.toFixed(2)}`);
        doc.text(`GST (18%): ₹${gst.toFixed(2)}`);
        doc.text(`Grand Total: ₹${(order.totalPrice + gst).toFixed(2)}`);
        doc.moveDown();

        doc.text('Thank you for shopping with us!', { align: 'center' });
        doc.end();

        stream.on('finish', () => {resolve(filePath)});
        stream.on('error', (err) => {reject(err)});

    
    });
}
module.exports = generateInvoice;
