const { Resend } = require('resend');
const config = require('../config');

class ResendService {
    constructor() {
        this.client = new Resend(config.resend.apiKey);
    }

    async sendEmail({ to, subject, html }) {
        return this.client.emails.send({
            from: config.resend.from,
            to,
            subject,
            html,
            reply_to: config.resend.replyTo,
        });
    }
}

module.exports = new ResendService();
