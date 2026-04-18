const PDFDocument = require('pdfkit');

const generateInvoice = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      
      doc.fontSize(20).text("Myntra Clone Invoice", { align: "center" });
      doc.moveDown();

      doc.fontSize(12).text(`Order ID: ${order._id}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();

      doc.text("Items:");
      doc.moveDown();

      order.items.forEach((item, index) => {
        doc.text(
          `${index + 1}. Product ID: ${item.product} | Qty: ${item.quantity} | ₹${item.price}`
        );
      });

      doc.moveDown();
      doc.fontSize(14).text(`Total Amount: ₹${order.totalAmount}`, {
        align: "right"
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = generateInvoice;