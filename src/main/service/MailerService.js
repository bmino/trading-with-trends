const CONFIG = require('../../../config/application.js');
let nodemailer = require('nodemailer');
let xoauth2 = require('xoauth2');

let MailerService = {
    sendEmail: sendEmail,

    transporter : nodemailer.createTransport("SMTP", {
        service: 'gmail',
        auth: {
            XOAuth2: {
                user: CONFIG.MAIL_AUTH_CLIENT_USER,
                clientId: CONFIG.MAIL_AUTH_CLIENT_ID,
                clientSecret: CONFIG.MAIL_AUTH_CLIENT_SECRET,
                refreshToken: CONFIG.MAIL_AUTH_CLIENT_REFRESH
            }
        }
    })
};

module.exports = MailerService;


function sendEmail(subject, message, address) {
    if (!validTransport()) return Promise.reject(new Error('Invalid mail transport'));

    return new Promise(function(resolve, reject) {
        let mailOptions = {
            to: address,
            from: `Trading With Trends <${CONFIG.MAIL_AUTH_CLIENT_USER}>`,
            subject: subject,
            text: message
        };

        MailerService.transporter.sendMail(mailOptions, function(error, response) {
            if (error) return reject(error);
            return resolve('Message sent successfully');
        });
    });

}

function validTransport() {
    return (CONFIG.NOTIFICATION_EMAIL_ADDRESS &&
            CONFIG.MAIL_AUTH_CLIENT_USER &&
            CONFIG.MAIL_AUTH_CLIENT_ID &&
            CONFIG.MAIL_AUTH_CLIENT_SECRET &&
            CONFIG.MAIL_AUTH_CLIENT_REFRESH);
}