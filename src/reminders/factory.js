const { WhatsAppStrategy, SMSStrategy, EmailStrategy } = require('./strategies');
const config = require('../config');

/**
 * Factory for creating reminder strategies based on configuration.
 */
class ReminderFactory {
    static getStrategy(channel = config.messageChannel) {
        switch (channel.toLowerCase()) {
            case 'whatsapp':
                return new WhatsAppStrategy();
            case 'sms':
                return new SMSStrategy();
            case 'email':
                return new EmailStrategy();
            default:
                throw new Error(`Unsupported message channel: ${channel}`);
        }
    }
}

module.exports = ReminderFactory;
