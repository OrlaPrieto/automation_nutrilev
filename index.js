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
const moment = require('moment');
const { getGoogleAuth, updateCalendarEventColor, getTomorrowsEvents } = require('./services/googleCalendar');
const { setupCronJobs } = require('./jobs/cron');
const { redis, sendWhatsAppTemplate } = require('./services/whatsapp');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
 * Handle Twilio incoming messages and Quick Reply button clicks (POST).
 */
app.post('/webhook/twilio', async (req, res) => {
    res.sendStatus(200);

    const body = req.body;
    console.log('Twilio webhook received:', JSON.stringify(body, null, 2));

    const buttonText = body.ButtonText?.toLowerCase().trim();
    const phoneNumber = body.From?.replace('whatsapp:', '');

    if (!buttonText || !phoneNumber) return;

    const eventId = await redis.get(`cita:${phoneNumber}`);
    if (!eventId) {
        console.warn(`No eventId found in Redis for ${phoneNumber}`);
        return;
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
        console.error('Error processing button click:', error);
    }
});

/**
 * Cron job endpoint for Vercel.
 * Executes reminder logic directly without node-cron.
 */
app.get('/api/cron', async (req, res) => {
    console.log(`[${moment().format()}] Running appointment reminders job...`);

    try {
        const auth = getGoogleAuth();
        const events = await getTomorrowsEvents(auth);

        if (!events || events.length === 0) {
            console.log('No events found for tomorrow.');
            return res.status(200).send('No events found for tomorrow.');
        }

        for (const event of events) {
            const phoneNumber = event.description;
            const patientName = event.summary;
            const startTime = moment(event.start.dateTime || event.start.date).format('HH:mm');

            console.log(`Event: ${patientName}, Phone: ${phoneNumber}, Location: ${event.location}`);

            if (phoneNumber && phoneNumber.startsWith('+')) {
                console.log(`Sending reminder to ${patientName} at ${phoneNumber}...`);
                // await sendWhatsAppTemplate(phoneNumber, patientName, startTime, event.id, event);
            } else {
                console.warn(`Missing or invalid phone number for event: ${event.summary}`);
            }
        }

        res.status(200).send('Reminders processed.');
    } catch (error) {
        console.error('Error in cron job:', error);
        res.status(500).send('Error processing reminders.');
    }
});


app.get('/api/test', (req, res) => {
    console.log('TEST ENDPOINT CALLED - no messages sent');
    res.status(200).send('Test OK');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Webhook server is listening on port ${PORT}`);
    // setupCronJobs();
});