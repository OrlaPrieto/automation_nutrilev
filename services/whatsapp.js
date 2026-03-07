const twilio = require('twilio');
const { Redis } = require('@upstash/redis');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const BASE_URL = process.env.BASE_URL || 'https://tu-proyecto.vercel.app';

/**
 * Generate a Google Calendar invite link for the event.
 * @param {object} event Google Calendar event object.
 * @returns {string} Google Calendar invite link.
 */
function generateCalendarLink(event) {
    const start = (event.start.dateTime || event.start.date).replace(/[-:]/g, '').replace('.000Z', 'Z');
    const end = (event.end.dateTime || event.end.date).replace(/[-:]/g, '').replace('.000Z', 'Z');

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.summary || 'Cita',
        dates: `${start}/${end}`,
        details: event.description || '',
        location: event.location || ''
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Send a reminder message to a patient via SMS or WhatsApp depending on MESSAGE_CHANNEL env variable.
 * @param {string} phoneNumber Patient's phone number in international format (e.g. +521234567890).
 * @param {string} patientName Patient's name.
 * @param {string} time Appointment time.
 * @param {string} eventId Google Calendar event ID.
 * @param {object} event Full Google Calendar event object (used to generate calendar link).
 */
async function sendWhatsAppTemplate(phoneNumber, patientName, time, eventId, event) {
    const channel = process.env.MESSAGE_CHANNEL || 'whatsapp';

    try {
        let response;

        if (channel === 'sms') {
            // SMS mode: send plain text message with calendar link
            const calendarLink = event ? generateCalendarLink(event) : null;

            const message =
                `Hola ${patientName}, te recordamos que tienes una cita mañana a las ${time}.\n\n` +
                (calendarLink ? `Agregar a tu calendario: ${calendarLink}` : '');

            response = await client.messages.create({
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phoneNumber,
                body: message
            });

            console.log(`SMS sent to ${phoneNumber}, SID: ${response.sid}`);

        } else {
            // WhatsApp mode: use approved template with Quick Reply buttons
            // Save eventId in Redis associated to phone number, expires in 24 hours
            await redis.set(`cita:${phoneNumber}`, eventId, { ex: 86400 });
            console.log(`Saved eventId ${eventId} for ${phoneNumber} in Redis`);

            response = await client.messages.create({
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `whatsapp:${phoneNumber}`,
                contentSid: process.env.TWILIO_TEMPLATE_SID,
                contentVariables: JSON.stringify({
                    "1": patientName,
                    "2": time
                })
            });

            console.log(`WhatsApp message sent to ${phoneNumber}, SID: ${response.sid}`);
        }

        return response;
    } catch (error) {
        console.error('Error sending message:', error.message);
        throw error;
    }
}

module.exports = {
    sendWhatsAppTemplate,
    redis
};