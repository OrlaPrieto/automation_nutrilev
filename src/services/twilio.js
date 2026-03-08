const twilio = require('twilio');
const config = require('../config');

class TwilioService {
    constructor() {
        this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    }

    async sendSMS(to, body) {
        return this.client.messages.create({
            from: config.twilio.phoneNumber,
            to,
            body,
        });
    }

    async sendWhatsApp(to, patientName, time) {
        return this.client.messages.create({
            from: config.twilio.phoneNumber,
            to: `whatsapp:${to}`,
            contentSid: config.twilio.templateSid,
            contentVariables: JSON.stringify({ "1": patientName, "2": time }),
        });
    }
}

module.exports = new TwilioService();
