const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text) {
  return `
    <div style="font-family: Arial, sans-serif; font-size:15px; line-height:1.6">
      ${escapeHtml(text).replace(/\r?\n/g, "<br/>")}
    </div>
  `;
}

function mapAttachments(attachments = []) {
  return attachments.map((att) => ({
    filename: att.filename,
    content: Buffer.isBuffer(att.content)
      ? att.content.toString("base64")
      : att.content,
  }));
}

const sendEmail = async (
  to,
  subject,
  text,
  html = null,
  attachments = []
) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const payload = {
      from:
        process.env.RESEND_FROM ||
        "Myntra Clone <onboarding@resend.dev>",

      to: Array.isArray(to) ? to : [to],

      subject,

      html: html || textToHtml(text),

      text: text || "",

      attachments:
        attachments.length > 0
          ? mapAttachments(attachments)
          : undefined,
    };

    console.log("Sending email to:", payload.to);

    const response = await resend.emails.send(payload);

    console.log("Email sent successfully:", response);

    return response;

  } catch (error) {

    console.error("EMAIL ERROR:");
    console.error(error);

    throw error;
  }
};

module.exports = sendEmail;