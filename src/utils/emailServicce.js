import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendEmail = async(to, subject, htmlContent) => {
    try{
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            html: htmlContent
        }

        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to}`);
        return true;
    }catch(error){
        console.error(`Error sending email to ${to}`, error);
        return false;
    }
}