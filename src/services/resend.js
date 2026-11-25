const { Resend } = require('resend');
const config = require('../config');

class ResendService {
    constructor() {
        this.client = new Resend(config.resend.apiKey);
    }

    async sendEmail({ to, subject, html }) {
        const { data, error } = await this.client.emails.send({
            from: config.resend.from,
            to,
            subject,
            html,
            reply_to: config.resend.replyTo,
        });

        if (error) {
            throw new Error(error.message || 'Error sending email via Resend');
        }

        return data;
    }
}

module.exports = new ResendService();
