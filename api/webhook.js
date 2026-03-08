const calendar = require('../src/services/google-calendar');
const redis = require('../src/services/redis');
const config = require('../src/config');

module.exports = async function handler(req, res) {
    const method = req.method;

    // --- GET: WhatsApp verification OR Email actions ---
    if (method === 'GET') {
        const { action, eventId } = req.query;

        // 1. Email confirm/cancel actions
        if (action && eventId) {
            console.log(`Received email action: ${action} for eventId: ${eventId}`);
            try {
                const colorId = action === 'CONFIRM' ? '2' : '11'; // 2=Green, 11=Red
                await calendar.updateEventColor(eventId, colorId);

                const isConfirm = action === 'CONFIRM';
                return res.status(200).send(renderResponseHtml(isConfirm));
            } catch (error) {
                console.error('Error processing email action:', error.message);
                return res.status(500).send('Error procesando tu solicitud.');
            }
        }

        // 2. WhatsApp webhook verification
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
            console.log('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        }

        return res.status(403).send('Forbidden');
    }

    // --- POST: Handle WhatsApp/Twilio button clicks ---
    if (method === 'POST') {
        const body = req.body;
        const buttonText = body.ButtonText?.toLowerCase().trim();
        const phoneNumber = body.From?.replace('whatsapp:', '');

        if (!buttonText || !phoneNumber) {
            return res.status(200).send('OK');
        }

        try {
            const eventId = await redis.get(`cita:${phoneNumber}`);
            if (!eventId) {
                console.warn(`No eventId found in Redis for ${phoneNumber}`);
                return res.status(200).send('OK');
            }

            console.log(`Received "${buttonText}" from ${phoneNumber} for eventId ${eventId}`);

            if (buttonText.includes('confirmar')) {
                await calendar.updateEventColor(eventId, '2');
                await redis.del(`cita:${phoneNumber}`);
            } else if (buttonText.includes('cancelar')) {
                await calendar.updateEventColor(eventId, '11');
                await redis.del(`cita:${phoneNumber}`);
            }
        } catch (error) {
            console.error('Error processing button click:', error.message);
        }

        return res.status(200).send('OK');
    }

    return res.status(405).send('Method Not Allowed');
};

/**
 * Simple HTML response for email actions.
 */
function renderResponseHtml(isConfirm) {
    const title = isConfirm ? '✅ ¡Cita Confirmada!' : '❌ Cita Cancelada';
    const subtitle = isConfirm
        ? 'Tu cita ha sido confirmada exitosamente. ¡Te esperamos mañana!'
        : 'Tu cita ha sido cancelada. Si deseas reagendar, contáctanos por WhatsApp.';
    const color = isConfirm ? '#e91e8c' : '#6b7280';

    let extraLink = '';
    if (!isConfirm) {
        const waLink = `https://wa.me/${config.clinic.phone.replace(/\D/g, '')}?text=Hola%2C%20me%20gustar%C3%ADa%20reagendar%20mi%20cita.`;
        extraLink = `<a href="${waLink}" style="display:inline-block;margin-top:20px;background:#25d366;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;">💬 Reagendar por WhatsApp</a>`;
    }

    return `
    <html><body style="font-family:Arial;text-align:center;padding:60px;background:#fff0f5;">
      <h1 style="color:#e91e8c;">${title}</h1>
      <p style="color:${color};">${subtitle}</p>
      ${extraLink}
    </body></html>
  `;
}