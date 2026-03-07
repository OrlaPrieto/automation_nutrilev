const { getGoogleAuth, updateCalendarEventColor } = require('../services/googleCalendar');
const { redis } = require('../services/whatsapp');

module.exports = async function handler(req, res) {
    // --- GET: WhatsApp webhook verification ---
    if (req.method === 'GET') {
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

        // Get eventId from Redis using phone number
        const eventId = await redis.get(`cita:${phoneNumber}`);
        if (!eventId) {
            console.warn(`No eventId found in Redis for ${phoneNumber}`);
            return res.status(200).send('OK');
        }

        console.log(`Received "${buttonText}" from ${phoneNumber} for eventId ${eventId}`);

        try {
            const auth = getGoogleAuth();

            if (buttonText.includes('confirmar')) {
                await updateCalendarEventColor(eventId, '2', auth); // Green
                console.log(`Event ${eventId} updated to CONFIRMED (Green).`);
                await redis.del(`cita:${phoneNumber}`);
            } else if (buttonText.includes('cancelar')) {
                await updateCalendarEventColor(eventId, '11', auth); // Red
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