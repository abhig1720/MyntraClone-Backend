const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text, html = null, attachments = []) => {
    try {
        // ❌ Removed credential logging (security risk)
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error("Missing email credentials in environment variables");
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
            ...(html && { html }),                          // ✅ Optional HTML body
            ...(attachments.length > 0 && { attachments }) // ✅ Cleaner attachment handling
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully"); // ✅ Fixed typo: "succesfully"

    } catch (error) {
        console.error("Error sending email:", error); // ✅ use console.error for errors
        throw error; // ✅ Rethrow so the caller knows it failed
    }
};

module.exports = sendEmail;