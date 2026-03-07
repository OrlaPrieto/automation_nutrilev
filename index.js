require('dotenv').config();

// Vercel: write Google credentials from env variable to /tmp file
const fs = require('fs');
const path = require('path');
if (process.env.GOOGLE_CREDENTIALS_JSON) {
    const credentialsPath = path.join('/tmp', 'google-credentials.json');
    fs.writeFileSync(credentialsPath, process.env.GOOGLE_CREDENTIALS_JSON);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}

const express = require('express');
const { getGoogleAuth, updateCalendarEventColor } = require('./services/googleCalendar');
const { setupCronJobs } = require('./jobs/cron');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Required for Twilio webhooks

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * WhatsApp Webhook verification (GET) - kept for Meta compatibility.
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
 * Handle confirm/cancel actions via link click.
 * Links are sent in the WhatsApp message body.
 */
app.get('/webhook/action', async (req, res) => {
    const { action, eventId } = req.query;

    if (!action || !eventId) {
        return res.status(400).send('Missing action or eventId');
    }

    console.log(`Received action: ${action} for eventId: ${eventId}`);

    try {
        const auth = getGoogleAuth();

        if (action === 'CONFIRM') {
            await updateCalendarEventColor(eventId, '2', auth); // Green
            console.log(`Event ${eventId} updated to CONFIRMED (Green).`);
            res.send('✅ Tu cita ha sido confirmada. ¡Hasta pronto!');
        } else if (action === 'CANCEL') {
            await updateCalendarEventColor(eventId, '11', auth); // Red
            console.log(`Event ${eventId} updated to CANCELLED (Red).`);
            res.send('❌ Tu cita ha sido cancelada. Si deseas reagendar, contáctanos.');
        } else {
            res.status(400).send('Invalid action');
        }
    } catch (error) {
        console.error('Error processing action:', error);
        res.status(500).send('Ocurrió un error. Por favor intenta de nuevo.');
    }
});

/**
 * Twilio incoming message webhook (POST).
 * Optional: handle replies from patients via WhatsApp.
 */
app.post('/webhook', async (req, res) => {
    res.sendStatus(200);

    const body = req.body;
    console.log('Twilio webhook received:', JSON.stringify(body, null, 2));
});

// Cron job endpoint for Vercel
app.get('/api/cron', (req, res) => {
    setupCronJobs();
    res.sendStatus(200);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Webhook server is listening on port ${PORT}`);
    setupCronJobs();
});