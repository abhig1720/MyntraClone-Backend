const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
    try{
        const transporter = nodemailer.createTransport({
            service:"gmail",
            auth:{
                user:"abhig172003@gmail.com",
                pass:"xbefgkkmppyylvim"
            }
        });

        const mailOptions ={
            from:"abhig172003@gmail.com",
            to,
            subject,
            text
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent succesfully");
    }
    catch(error){
        console.log("Error sending email:",error);;
    }
};

module.exports = sendEmail;