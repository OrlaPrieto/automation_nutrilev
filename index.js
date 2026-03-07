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
const { redis } = require('./services/whatsapp');

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
 * Handle Twilio incoming messages and Quick Reply button clicks (POST).
 */
app.post('/webhook/twilio', async (req, res) => {
    res.sendStatus(200);

    const body = req.body;
    console.log('Twilio webhook received:', JSON.stringify(body, null, 2));

    const buttonText = body.ButtonText?.toLowerCase().trim();
    const phoneNumber = body.From?.replace('whatsapp:', '');

    if (!buttonText || !phoneNumber) return;

    // Get eventId from Redis using phone number
    const eventId = await redis.get(`cita:${phoneNumber}`);
    if (!eventId) {
        console.warn(`No eventId found in Redis for ${phoneNumber}`);
        return;
    }

    console.log(`Received "${buttonText}" from ${phoneNumber} for eventId ${eventId}`);

    try {
        const auth = getGoogleAuth();

        if (buttonText.includes('confirmar')) {
            await updateCalendarEventColor(eventId, '2', auth); // Green
            console.log(`Event ${eventId} updated to CONFIRMED (Green).`);
            // Delete from Redis after processing
            await redis.del(`cita:${phoneNumber}`);
        } else if (buttonText.includes('cancelar')) {
            await updateCalendarEventColor(eventId, '11', auth); // Red
            console.log(`Event ${eventId} updated to CANCELLED (Red).`);
            // Delete from Redis after processing
            await redis.del(`cita:${phoneNumber}`);
        }
    } catch (error) {
        console.error('Error processing button click:', error);
    }
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