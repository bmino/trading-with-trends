require('dotenv').config({path: '../../../config/application.env'});
let nodemailer = require('nodemailer');
let xoauth2 = require('xoauth2');


let MailerService = {

    sendEmail: sendEmail,

    transporter : nodemailer.createTransport("SMTP", {
        service: 'gmail',
        auth: {
            XOAuth2: {
                user: process.env.EMAIL_ADDRESS,
                clientId: process.env.AUTH_CLIENT_ID,
                clientSecret: process.env.AUTH_CLIENT_SECRET,
                refreshToken: process.env.AUTH_CLIENT_REFRESH
            }
        }
    })
};

module.exports = MailerService;


function sendEmail(subject, message, address) {
    console.log(`Trying to send email to ${address}`);

    if (!validTransport()) return Promise.reject(new Error('Invalid mail transport'));

    return new Promise(function(resolve, reject) {
        let mailOptions = {
            to: address,
            from: `${process.env.EMAIL_TITLE} <${process.env.EMAIL_ADDRESS}>`,
            subject: subject,
            text: message
        };

        MailerService.transporter.sendMail(mailOptions, function(error, response) {
            if (error) return reject(error);
            console.log(`Message sent to ${address}`);
            return resolve('Message sent successfully');
        });
    });

}

function validTransport() {
    return (process.env.EMAIL_TITLE &&
            process.env.EMAIL_ADDRESS &&
            process.env.AUTH_CLIENT_ID &&
            process.env.AUTH_CLIENT_SECRET &&
            process.env.AUTH_CLIENT_REFRESH);
}