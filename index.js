require('dotenv').config();
const express = require('express');
const { getGoogleAuth, updateCalendarEventColor } = require('./services/googleCalendar');
const { setupCronJobs } = require('./jobs/cron');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * WhatsApp Webhook verification (GET).
 */
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

/**
 * Handle incoming WhatsApp messages and button clicks (POST).
 */
app.post('/webhook', async (req, res) => {
    // Acknowledge receipt immediately
    res.sendStatus(200);

    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
        const changes = body.entry?.[0]?.changes?.[0]?.value;
        const message = changes?.messages?.[0];

        // Check if it's an interactive button click
        if (message?.type === 'button') {
            const payload = message.button.payload; // e.g., CONFIRM_eventId
            const [action, eventId] = payload.split('_');

            console.log(`Received action: ${action} for eventId: ${eventId}`);

            try {
                const auth = getGoogleAuth();
                if (action === 'CONFIRM') {
                    // 2 = Green (Confirmed)
                    await updateCalendarEventColor(eventId, '2', auth);
                    console.log(`Event ${eventId} updated to CONFIRMED (Green).`);
                } else if (action === 'CANCEL') {
                    // 11 = Red (Cancelled)
                    await updateCalendarEventColor(eventId, '11', auth);
                    console.log(`Event ${eventId} updated to CANCELLED (Red).`);
                }
            } catch (error) {
                console.error(`Error processing webhook action:`, error);
            }
        }
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Webhook server is listening on port ${PORT}`);

    // Initialize scheduled tasks
    setupCronJobs();
});
