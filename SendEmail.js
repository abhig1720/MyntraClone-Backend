const { Resend } = require('resend');

const sendEmail = async (
  to,
  subject,
  html,
  attachments = []
) => {

  if (!process.env.RESEND_API_KEY) {

    console.error(
      "Missing RESEND_API_KEY in environment"
    );

    throw new Error(
      "Email configuration error"
    );
  }

  const resend = new Resend(
    process.env.RESEND_API_KEY
  );

  try {

    const response =
      await resend.emails.send({

        from:
          "Myntra Clone <onboarding@resend.dev>",

        to,

        subject,

        html,

        attachments,
      });

    // IMPORTANT
    // RESEND RETURNS ERROR INSIDE RESPONSE
    if (response.error) {

      console.error(
        "Resend Error:",
        response.error
      );

      throw new Error(
        response.error.message
      );
    }

    console.log(
      "Email sent successfully:",
      response.data
    );

    return response.data;

  } catch (error) {

    console.error(
      "Error sending email:",
      error
    );

    throw error;
  }
};

module.exports = { sendEmail };