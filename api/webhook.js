const { getGoogleAuth, updateCalendarEventColor } = require('../services/googleCalendar');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

module.exports = async function handler(req, res) {
    // --- GET: WhatsApp webhook verification ---
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                return res.status(403).send('Forbidden');
            }
        }
        return res.status(400).send('Bad Request');
    }

    // --- POST: Handle incoming WhatsApp messages ---
    if (req.method === 'POST') {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            const changes = body.entry?.[0]?.changes?.[0]?.value;
            const message = changes?.messages?.[0];

            // Check if it's an interactive button click
            if (message?.type === 'button') {
                const payload = message.button.payload; // e.g., CONFIRM_eventId123_abc

                // Fix: only split on the FIRST underscore to preserve full eventId
                const underscoreIndex = payload.indexOf('_');
                const action = payload.substring(0, underscoreIndex);
                const eventId = payload.substring(underscoreIndex + 1);

                console.log(`Received action: ${action} for eventId: ${eventId}`);

                try {
                    const auth = getGoogleAuth();
                    if (action === 'CONFIRM') {
                        await updateCalendarEventColor(eventId, '2', auth);
                        console.log(`Event ${eventId} updated to CONFIRMED (Green).`);
                    } else if (action === 'CANCEL') {
                        await updateCalendarEventColor(eventId, '11', auth);
                        console.log(`Event ${eventId} updated to CANCELLED (Red).`);
                    }
                } catch (error) {
                    console.error('Error processing webhook action:', error.message || error);
                }
            }
        }

        return res.status(200).send('OK');
    }

    return res.status(405).send('Method Not Allowed');
};
