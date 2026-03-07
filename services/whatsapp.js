const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send a WhatsApp reminder message to a patient via Twilio.
 * @param {string} phoneNumber Patient's phone number in international format (e.g. +521234567890).
 * @param {string} patientName Patient's name.
 * @param {string} time Appointment time.
 * @param {string} eventId Google Calendar event ID.
 */
async function sendWhatsAppTemplate(phoneNumber, patientName, time, eventId) {
    const confirmUrl = `https://tu-proyecto.vercel.app/webhook/action?action=CONFIRM&eventId=${eventId}`;
    const cancelUrl = `https://tu-proyecto.vercel.app/webhook/action?action=CANCEL&eventId=${eventId}`;

    const message =
        `Hola ${patientName} 👋, te recordamos que tienes una cita mañana a las *${time}*.\n\n` +
        `¿Confirmas tu asistencia?\n\n` +
        `✅ Confirmar: ${confirmUrl}\n` +
        `❌ Cancelar: ${cancelUrl}`;

    try {
        const response = await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `whatsapp:${phoneNumber}`,
            body: message
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