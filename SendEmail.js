const { Resend } = require("resend");

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text) {
  return `<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">${escapeHtml(text)
    .split(/\r?\n/)
    .join("<br/>")}</p>`;
}

function mapAttachments(attachments) {
  if (!attachments || attachments.length === 0) return undefined;
  return attachments.map((att) => ({
    filename: att.filename,
    content: Buffer.isBuffer(att.content) ? att.content.toString("base64") : att.content
  }));
}

/**
 * Same shape as before (Nodemailer): (to, subject, text, html?, attachments?)
 * so OrdersRoutes does not need changes. Uses Resend under the hood.
 */
const sendEmail = async (to, subject, text, html = null, attachments = []) => {
  if (!process.env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY in environment");
    throw new Error("Email configuration error");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from =
    process.env.RESEND_FROM || "Myntra Clone <onboarding@resend.dev>";

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject
  };

  if (html) {
    payload.html = html;
    if (text) payload.text = text;
  } else if (text) {
    payload.text = text;
    payload.html = textToHtml(text);
  } else {
    payload.html = "<p></p>";
  }

  const mapped = mapAttachments(attachments);
  if (mapped) payload.attachments = mapped;

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    console.error("Resend error:", error);
    throw new Error(error.message || "Failed to send email");
  }

  console.log("Email sent successfully:", data?.id ?? data);
  return data;
};

module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
