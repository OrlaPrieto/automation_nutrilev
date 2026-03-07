const twilio = require('twilio');
const { Redis } = require('@upstash/redis');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
});

/**
 * Send a WhatsApp reminder message to a patient via Twilio Quick Reply template.
 * Saves the eventId in Redis associated to the patient's phone number.
 * @param {string} phoneNumber Patient's phone number in international format (e.g. +521234567890).
 * @param {string} patientName Patient's name.
 * @param {string} time Appointment time.
 * @param {string} eventId Google Calendar event ID.
 */
async function sendWhatsAppTemplate(phoneNumber, patientName, time, eventId) {
    try {
        // Save eventId in Redis associated to phone number, expires in 24 hours
        await redis.set(`cita:${phoneNumber}`, eventId, { ex: 86400 });
        console.log(`Saved eventId ${eventId} for ${phoneNumber} in Redis`);

        const response = await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `whatsapp:${phoneNumber}`,
            contentSid: process.env.TWILIO_TEMPLATE_SID,
            contentVariables: JSON.stringify({
                "1": patientName,
                "2": time
            })
        });

        console.log(`Message sent to ${phoneNumber}, SID: ${response.sid}`);
        return response;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.message);
        throw error;
    }
}

module.exports = {
    sendWhatsAppTemplate,
    redis
};