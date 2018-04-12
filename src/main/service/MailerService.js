require('dotenv').config({path: '../../../config/application.env'});
let nodemailer = require('nodemailer');
let xoauth2 = require('xoauth2');

let MailerService = {
    sendEmail: sendEmail,

    transporter : nodemailer.createTransport("SMTP", {
        service: 'gmail',
        auth: {
            XOAuth2: {
                user: process.env.MAIL_AUTH_CLIENT_USER,
                clientId: process.env.MAIL_AUTH_CLIENT_ID,
                clientSecret: process.env.MAIL_AUTH_CLIENT_SECRET,
                refreshToken: process.env.MAIL_AUTH_CLIENT_REFRESH
            }
        }
    })
};

module.exports = MailerService;


function sendEmail(subject, message, address) {
    console.log(`Trying to send "${subject}" message to ${address}`);

    if (!validTransport()) return Promise.reject(new Error('Invalid mail transport'));

    return new Promise(function(resolve, reject) {
        let mailOptions = {
            to: address,
            from: `Trading With Trends <${process.env.MAIL_AUTH_CLIENT_USER}>`,
            subject: subject,
            text: message
        };

        MailerService.transporter.sendMail(mailOptions, function(error, response) {
            if (error) return reject(error);
            console.log(`"${subject}" message sent to ${address}`);
            return resolve('Message sent successfully');
        });
    });

}

function validTransport() {
    return (process.env.NOTIFICATION_EMAIL_ADDRESS &&
            process.env.MAIL_AUTH_CLIENT_USER &&
            process.env.MAIL_AUTH_CLIENT_ID &&
            process.env.MAIL_AUTH_CLIENT_SECRET &&
            process.env.MAIL_AUTH_CLIENT_REFRESH);
}