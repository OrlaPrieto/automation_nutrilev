const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const BASE_URL = process.env.BASE_URL || 'https://tu-proyecto.vercel.app';

/**
 * Send a WhatsApp reminder message to a patient via Twilio template.
 * @param {string} phoneNumber Patient's phone number in international format (e.g. +521234567890).
 * @param {string} patientName Patient's name.
 * @param {string} time Appointment time.
 * @param {string} eventId Google Calendar event ID.
 */
async function sendWhatsAppTemplate(phoneNumber, patientName, time, eventId) {
    const confirmUrl = `${BASE_URL}/webhook/action?action=CONFIRM&eventId=${eventId}`;
    const cancelUrl = `${BASE_URL}/webhook/action?action=CANCEL&eventId=${eventId}`;

    try {
        const response = await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `whatsapp:${phoneNumber}`,
            contentSid: 'HXaaae8d63594a8a1521c4c5672cde94ac',
            contentVariables: JSON.stringify({
                "1": patientName,
                "2": time,
                "3": confirmUrl,
                "4": cancelUrl
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
    sendWhatsAppTemplate
};