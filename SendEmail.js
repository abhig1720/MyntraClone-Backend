const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
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
            text,
            attachments:[
                {
                    filename:"invoice.pdf",
                    path :invoicePath,
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent succesfully");
    }
    catch(error){
        console.log("Error sending email:",error);;
    }
};

module.exports = sendEmail;