const axios = require('axios');

/**
 * Send a WhatsApp Message Template to a patient.
 * @param {string} phoneNumber Patient's phone number in international format.
 * @param {string} patientName Patient's name for the template.
 * @param {string} time Appointment time for the template.
 * @param {string} eventId Google Calendar event ID to be included in the button payload.
 */
async function sendWhatsAppTemplate(phoneNumber, patientName, time, eventId) {
    const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
            name: process.env.WHATSAPP_TEMPLATE_NAME || "recordatorio_cita",
            language: { code: "es_MX" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: patientName },
                        { type: "text", text: time }
                    ]
                },
                {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "0",
                    parameters: [{ type: "payload", payload: `CONFIRM_${eventId}` }]
                },
                {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "1",
                    parameters: [{ type: "payload", payload: `CANCEL_${eventId}` }]
                }
            ]
        }
    };

    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = {
    sendWhatsAppTemplate
};
