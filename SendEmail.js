const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

// Set API Key if available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendEmail = async (to, subject, text, attachmentBuffer = null) => {
  try {
    if (process.env.SENDGRID_API_KEY) {
      // Use SendGrid if API key is provided
      const msg = {
        to,
        from: 'abhig172003@gmail.com', // Replace with your verified SendGrid sender email
        subject,
        text,
      };

      if (attachmentBuffer) {
        msg.attachments = [
          {
            content: attachmentBuffer.toString('base64'),
            filename: 'invoice.pdf',
            type: 'application/pdf',
            disposition: 'attachment',
          },
        ];
      }

      await sgMail.send(msg);
      console.log('Email sent successfully using SendGrid');
    } else {
      // Fallback to Nodemailer
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'abhig172003@gmail.com',
          pass: 'xbefgkkmppyylvim',
        },
      });

      const mailOptions = {
        from: 'abhig172003@gmail.com',
        to,
        subject,
        text,
      };

      if (attachmentBuffer) {
        mailOptions.attachments = [
          {
            filename: 'invoice.pdf',
            content: attachmentBuffer,
            contentType: 'application/pdf',
          },
        ];
      }

      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully using Nodemailer');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

module.exports = sendEmail;