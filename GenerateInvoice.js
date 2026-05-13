const PDFDocument = require('pdfkit');

const generateInvoicePdf = (order, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // ── Header ──────────────────────────────────────────────
      doc
        .fillColor('#444444')
        .fontSize(20)
        .text('Bata Clone', 50, 57)
        .fontSize(10)
        .text('Bata Clone.', 200, 50, { align: 'right' })
        .text('123 Main Street', 200, 65, { align: 'right' })
        .text('New Delhi, India, 110001', 200, 80, { align: 'right' })
        .text('GST No: 07AABCU9603R1ZX', 200, 95, { align: 'right' })
        .moveDown();

      const generateHr = (y) => {
        doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
      };

      generateHr(120);

      // ── Customer Details ─────────────────────────────────────
      const customerInformationTop = 140;

      doc
        .fontSize(16)
        .text('Invoice', 50, customerInformationTop)
        .fontSize(10)
        .text('Invoice Number:', 50, customerInformationTop + 30)
        .text(order._id.toString(), 150, customerInformationTop + 30)
        .text('Invoice Date:', 50, customerInformationTop + 45)
        .text(new Date().toLocaleDateString(), 150, customerInformationTop + 45)
        .text('Total Amount:', 50, customerInformationTop + 60)
        .text(`Rs. ${order.totalAmount}`, 150, customerInformationTop + 60)  // ✅ fixed backtick
        .text('Billed To:', 300, customerInformationTop + 30)
        .text(user.name || 'Customer', 300, customerInformationTop + 45)
        .text(user.email || '', 300, customerInformationTop + 60)
        .text(user.phone || '', 300, customerInformationTop + 75)
        .text(order.address || '', 300, customerInformationTop + 90)
        .moveDown();

      generateHr(250);

      // ── Invoice Table Header ──────────────────────────────────
      const invoiceTableTop = 270;

      doc.font('Helvetica-Bold');
      doc.text('Item', 50, invoiceTableTop);
      doc.text('Description', 150, invoiceTableTop);
      doc.text('Unit Cost', 280, invoiceTableTop, { width: 90, align: 'right' });
      doc.text('Quantity', 370, invoiceTableTop, { width: 90, align: 'right' });
      doc.text('Line Total', 460, invoiceTableTop, { width: 90, align: 'right' });
      doc.font('Helvetica');

      generateHr(290);

      // ── GST Calculation ───────────────────────────────────────
      const GST_RATE = 0.18;
      const totalAmount = order.totalAmount;
      const subtotal = totalAmount / (1 + GST_RATE);
      const gstAmount = totalAmount - subtotal;

      // ── Invoice Rows ──────────────────────────────────────────
      let y = 310;

      order.items.forEach((item, index) => {
        // ✅ Add new page if content exceeds page height
        if (y > 680) {
          doc.addPage();
          y = 50;
        }

        const price = item.price || item.product?.price || 0;
        const qty = item.quantity || 1;
        const lineTotal = price * qty;
        const name = item.product?.name
          ? item.product.name.substring(0, 20)
          : 'Product';

        doc.fontSize(10);
        doc.text((index + 1).toString(), 50, y);
        doc.text(name, 150, y);
        doc.text(`Rs. ${price}`, 280, y, { width: 90, align: 'right' });   // ✅ fixed
        doc.text(qty.toString(), 370, y, { width: 90, align: 'right' });
        doc.text(`Rs. ${lineTotal}`, 460, y, { width: 90, align: 'right' });   // ✅ fixed

        generateHr(y + 20);
        y += 30;
      });

      // ── Totals ────────────────────────────────────────────────
      y += 10;

      doc.font('Helvetica-Bold');
      doc.text('Subtotal:', 370, y, { width: 90, align: 'right' });
      doc.font('Helvetica');
      doc.text(`Rs. ${subtotal.toFixed(2)}`, 460, y, { width: 90, align: 'right' }); // ✅ fixed

      doc.font('Helvetica-Bold');
      doc.text('GST (18%):', 370, y + 20, { width: 90, align: 'right' });
      doc.font('Helvetica');
      doc.text(`Rs. ${gstAmount.toFixed(2)}`, 460, y + 20, { width: 90, align: 'right' }); // ✅ fixed

      doc.font('Helvetica-Bold');
      doc.text('Total:', 370, y + 40, { width: 90, align: 'right' });
      doc.font('Helvetica');
      doc.text(`Rs. ${totalAmount.toFixed(2)}`, 460, y + 40, { width: 90, align: 'right' }); // ✅ fixed

      generateHr(y + 60);

      // ── Footer ────────────────────────────────────────────────
      // ✅ Dynamic position instead of hardcoded 700
      doc.fontSize(10).text(
        'Thank you for shopping with Bata Clone.',
        50,
        y + 80,
        { align: 'center', width: 500 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateInvoicePdf;