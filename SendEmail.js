const { Resend } = require('resend');

const sendEmail = async (to, subject, html, attachments = []) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY in environment");
    throw new Error("Email configuration error");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const data = await resend.emails.send({
      from: "Myntra Clone <onboarding@resend.dev>",
      to,
      subject,
      html,
      attachments,
    });
    console.log("Email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

module.exports = { sendEmail };