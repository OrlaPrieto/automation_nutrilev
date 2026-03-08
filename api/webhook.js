const { getGoogleAuth, updateCalendarEventColor } = require('../services/googleCalendar');
const { redis } = require('../services/whatsapp');

module.exports = async function handler(req, res) {

    // --- GET: WhatsApp webhook verification OR email button action ---
    if (req.method === 'GET') {
        const { action, eventId } = req.query;

        // Email confirm/cancel action
        if (action && eventId) {
            console.log(`Received email action: ${action} for eventId: ${eventId}`);
            try {
                const auth = getGoogleAuth();
                if (action === 'CONFIRM') {
                    await updateCalendarEventColor(eventId, '2', auth);
                    console.log(`Event ${eventId} updated to CONFIRMED (Green).`);
                    return res.status(200).send(`
                        <html><body style="font-family:Arial;text-align:center;padding:60px;background:#fff0f5;">
                            <h1 style="color:#e91e8c;">✅ ¡Cita Confirmada!</h1>
                            <p style="color:#6b7280;">Tu cita ha sido confirmada exitosamente. ¡Te esperamos mañana!</p>
                        </body></html>
                    `);
                } else if (action === 'CANCEL') {
                    await updateCalendarEventColor(eventId, '11', auth);
                    console.log(`Event ${eventId} updated to CANCELLED (Red).`);
                    return res.status(200).send(`
                        <html><body style="font-family:Arial;text-align:center;padding:60px;background:#fff0f5;">
                            <h1 style="color:#e91e8c;">❌ Cita Cancelada</h1>
                            <p style="color:#6b7280;">Tu cita ha sido cancelada. Si deseas reagendar, contáctanos por WhatsApp.</p>
                            <a href="https://wa.me/526143958598?text=Hola%2C%20me%20gustar%C3%ADa%20reagendar%20mi%20cita." 
                               style="display:inline-block;margin-top:20px;background:#25d366;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;">
                                💬 Reagendar por WhatsApp
                            </a>
                        </body></html>
                    `);
                }
            } catch (error) {
                console.error('Error processing email action:', error.message || error);
                return res.status(500).send('Error procesando tu solicitud.');
            }
        }

        // WhatsApp webhook verification
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                return res.status(403).send('Forbidden');
            }
        }

        return res.status(400).send('Bad Request');
    }

    // --- POST: Handle Twilio Quick Reply button clicks ---
    if (req.method === 'POST') {
        const body = req.body;
        console.log('Webhook received:', JSON.stringify(body, null, 2));

        const buttonText = body.ButtonText?.toLowerCase().trim();
        const phoneNumber = body.From?.replace('whatsapp:', '');

        if (!buttonText || !phoneNumber) {
            return res.status(200).send('OK');
        }

        const eventId = await redis.get(`cita:${phoneNumber}`);
        if (!eventId) {
            console.warn(`No eventId found in Redis for ${phoneNumber}`);
            return res.status(200).send('OK');
        }

        console.log(`Received "${buttonText}" from ${phoneNumber} for eventId ${eventId}`);

        try {
            const auth = getGoogleAuth();

            if (buttonText.includes('confirmar')) {
                await updateCalendarEventColor(eventId, '2', auth);
                console.log(`Event ${eventId} updated to CONFIRMED (Green).`);
                await redis.del(`cita:${phoneNumber}`);
            } else if (buttonText.includes('cancelar')) {
                await updateCalendarEventColor(eventId, '11', auth);
                console.log(`Event ${eventId} updated to CANCELLED (Red).`);
                await redis.del(`cita:${phoneNumber}`);
            }
        } catch (error) {
            console.error('Error processing button click:', error.message || error);
        }

        return res.status(200).send('OK');
    }

    return res.status(405).send('Method Not Allowed');
};