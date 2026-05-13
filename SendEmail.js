const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html, attachments = []) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  // ✅ In development, override recipient to your own email
  const recipient = process.env.TEST_OVERRIDE_EMAIL || to;

  try {
    const data = await resend.emails.send({
      from: "Myntra Clone <onboarding@resend.dev>",
      to: recipient,
      subject,
      html,
      ...(attachments.length > 0 && { attachments }),
    });

    console.log(`Email sent to ${recipient}:`, data);
    return data;

  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

module.exports = sendEmail;