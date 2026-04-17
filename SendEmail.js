const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text, attachments = []) => {
    try{
        const transporter = nodemailer.createTransport({
            service:"gmail",
            auth:{
                user:process.env.EMAIL_USER,
                pass:process.env.EMAIL_PASS
            }
        });

        const mailOptions ={
            from:process.env.EMAIL_USER,
            to,
            subject,
            text
        };
        if (attachments.length > 0) {
            mailOptions.attachments = attachments;
        }

        await transporter.sendMail(mailOptions);
        console.log("Email sent succesfully");
    }
    catch(error){
        console.log("Error sending email:", error);
    }
};

module.exports = sendEmail;