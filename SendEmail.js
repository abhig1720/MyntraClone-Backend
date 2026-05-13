const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html, attachments = []) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Missing EMAIL_USER or EMAIL_PASS in environment variables");
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `Myntra Clone <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  // ✅ Only add attachments if provided
  if (attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  await transporter.sendMail(mailOptions);
  console.log(`Email sent successfully to ${to}`);
};

module.exports = sendEmail;