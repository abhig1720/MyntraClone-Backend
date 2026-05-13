const PDFDocument = require('pdfkit');

function generateInvoice(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primary = '#ff3f6c';
    const secondary = '#282c3f';
    const textColor = '#333';
    const lightGray = '#f5f6f7';

    let currentY = 40;

    // ── Logo / Header ─────────────────────────────────────────
    doc
      .fillColor(primary)
      .fontSize(26)
      .font('Helvetica-Bold')
      .text('MYNTRA CLONE', 40, currentY);

    doc
      .fillColor(textColor)
      .fontSize(10)
      .font('Helvetica')
      .text('Fashion Street, Koramangala', 370, currentY)
      .text('Bengaluru, KA 560034', 370, currentY + 12)
      .text('India', 370, currentY + 24);

    currentY += 45;
    doc.moveTo(40, currentY).lineTo(555, currentY).stroke('#ccc');
    currentY += 15;

    // ── Title ─────────────────────────────────────────────────
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(secondary)
      .text('OFFICIAL RECEIPT', 40, currentY);

    currentY += 28;

    // ── Left: Invoice Details ─────────────────────────────────
    doc.fontSize(10).font('Helvetica');

    const leftX = 40;
    let leftY = currentY;

    const invoiceNo = `MYN-${new Date().getFullYear()}-${order._id.toString().substring(0, 6).toUpperCase()}`;

    drawKeyValue(doc, leftX, leftY, 'Invoice #:', invoiceNo); leftY += 15;
    drawKeyValue(doc, leftX, leftY, 'Order ID:', order._id); leftY += 15;
    drawKeyValue(doc, leftX, leftY, 'Date:', new Date().toLocaleDateString('en-IN')); leftY += 15;
    drawKeyValue(doc, leftX, leftY, 'Payment:', order.paymentMethod || 'Online'); leftY += 15;
    drawKeyValue(doc, leftX, leftY, 'Status:', order.status || 'Confirmed');

    // ── Right: Shipping Details ───────────────────────────────
    const rightX = 300;
    let rightY = currentY;

    drawKeyValue(doc, rightX, rightY, 'Shipping:', 'Standard Delivery'); rightY += 15;
    drawKeyValue(doc, rightX, rightY, 'Estimated:', '4–7 Business Days'); rightY += 15;
    drawKeyValue(doc, rightX, rightY, 'Shipping Cost:', 'Free'); rightY += 20;
    drawKeyValue(doc, rightX, rightY, 'GSTIN:', '29AABCM1234D1ZP'); rightY += 15;
    drawKeyValue(doc, rightX, rightY, 'Support:', 'support@myntraclone.com'); rightY += 15;
    drawKeyValue(doc, rightX, rightY, 'Phone:', '+91 80-4567-8900');

    // ── Billing Address ───────────────────────────────────────
    currentY = Math.max(leftY, rightY) + 20;

    doc.moveTo(40, currentY).lineTo(555, currentY).stroke('#ccc');
    currentY += 12;

    doc.font('Helvetica-Bold').fillColor(secondary).text('Billed To:', 40, currentY);
    currentY += 15;

    const addr = order.shippingAddress || {};

    // ✅ Fallback to order.address string if shippingAddress object is missing
    const addressLine = addr.addressLine || (typeof order.address === 'string' ? order.address : '');
    const cityLine = addr.city
      ? `${addr.city}, ${addr.state || ''} ${addr.zipCode || ''}`.trim()
      : '';

    doc
      .font('Helvetica')
      .fillColor(textColor)
      .text(addr.fullName || order.userName || 'N/A', 40, currentY)
      .text(addressLine, 40, currentY + 12)
      .text(cityLine, 40, currentY + 24);

    currentY += 52;

    // ── Table Header ──────────────────────────────────────────
    const tableTop = currentY;

    doc.rect(40, tableTop, 515, 22).fill(secondary);

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(10);

    tableRow(doc, tableTop + 6, 'Item', 'Qty', 'Price', 'Total');

    currentY = tableTop + 28;

    // ── Table Rows ────────────────────────────────────────────
    doc.fillColor(textColor).font('Helvetica');

    order.items.forEach((item, i) => {
      // ✅ Page overflow guard
      if (currentY > 680) {
        doc.addPage();
        currentY = 40;
      }

      const rowBg = i % 2 === 0 ? '#fafafa' : '#ffffff';
      doc.rect(40, currentY - 5, 515, 22).fill(rowBg).fillColor(textColor);

      // ✅ Fixed: use item.product?.name (populated) with fallback
      const productName = (
        item.product?.name ||
        item.name ||
        `Product ${i + 1}`
      ).substring(0, 40);

      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const lineTotal = price * qty;

      tableRow(
        doc,
        currentY,
        productName,
        qty,
        `\u20B9${price.toFixed(2)}`,
        `\u20B9${lineTotal.toFixed(2)}`
      );

      currentY += 22;
    });

    // ── Totals ────────────────────────────────────────────────
    currentY += 12;
    doc.moveTo(40, currentY).lineTo(555, currentY).stroke('#ccc');
    currentY += 12;

    const subtotal = Number(order.totalAmount) || 0;
    const gstRate = 0.12;
    const gst = subtotal * gstRate;
    const grandTotal = subtotal + gst;

    summaryRow(doc, currentY, 'Subtotal:', subtotal); currentY += 15;
    summaryRow(doc, currentY, 'GST (12%):', gst); currentY += 15;
    summaryRow(doc, currentY, 'Shipping:', 0); currentY += 20;

    // Grand Total highlight
    doc.rect(345, currentY - 5, 210, 26).fill(lightGray);

    doc
      .fillColor(primary)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Grand Total:', 355, currentY)
      .text(`\u20B9${grandTotal.toFixed(2)}`, 450, currentY, { align: 'right', width: 95 });

    // ── Footer ────────────────────────────────────────────────
    currentY += 55;

    doc.moveTo(40, currentY).lineTo(555, currentY).stroke('#eee');
    currentY += 10;

    doc
      .fontSize(9)
      .fillColor('#888')
      .font('Helvetica')
      .text(
        'Thank you for shopping with Myntra Clone! Easy returns within 30 days.',
        40, currentY, { align: 'center', width: 515 }
      );

    currentY += 12;

    doc.text(
      'This is a computer-generated invoice and does not require a signature.',
      40, currentY, { align: 'center', width: 515 }
    );

    doc.end();
  });
}

// ── Helpers ───────────────────────────────────────────────────
function drawKeyValue(doc, x, y, key, value) {
  doc.font('Helvetica-Bold').fillColor('#555').text(key, x, y);
  doc.font('Helvetica').fillColor('#333').text(String(value), x + 115, y);
}

function tableRow(doc, y, item, qty, price, total) {
  doc
    .fontSize(10)
    .text(item, 45, y, { width: 250 })
    .text(qty, 300, y, { width: 50, align: 'right' })
    .text(price, 375, y, { width: 75, align: 'right' })
    .text(total, 455, y, { width: 85, align: 'right' });
}

function summaryRow(doc, y, label, value) {
  doc
    .font('Helvetica')
    .fillColor('#555')
    .fontSize(10)
    .text(label, 355, y)
    .text(
      value === 0 ? 'FREE' : `\u20B9${value.toFixed(2)}`,
      450, y, { align: 'right', width: 95 }
    );
}

module.exports = generateInvoice;