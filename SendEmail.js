const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to,
      subject,
      html,
      attachments,
    });

    console.log("Email sent:", data);

    return data;

  } catch (error) {
    console.error("Resend Error:", error);
    throw error;
  }
};

module.exports = sendEmail;