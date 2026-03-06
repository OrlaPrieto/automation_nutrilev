const moment = require('moment');
const { getGoogleAuth, getTomorrowsEvents } = require('../services/googleCalendar');
const { sendWhatsAppTemplate } = require('../services/whatsapp');

module.exports = async function handler(req, res) {
    // Only allow POST (Vercel Cron invokes via GET, but we also accept POST)
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    console.log(`[${moment().format()}] Running appointment reminders job...`);

    try {
        const auth = getGoogleAuth();
        const events = await getTomorrowsEvents(auth);

        if (!events || events.length === 0) {
            console.log('No events found for tomorrow.');
            return res.status(200).json({ message: 'No events found for tomorrow.' });
        }

        const results = [];

        for (const event of events) {
            const phoneNumber = event.description || event.location;
            const patientName = event.summary;
            const startTime = moment(event.start.dateTime || event.start.date).format('HH:mm');

            if (phoneNumber && phoneNumber.startsWith('+')) {
                console.log(`Sending reminder to ${patientName} at ${phoneNumber}...`);
                await sendWhatsAppTemplate(phoneNumber, patientName, startTime, event.id);
                results.push({ patient: patientName, status: 'sent' });
            } else {
                console.warn(`Missing or invalid phone number for event: ${event.summary}`);
                results.push({ patient: patientName, status: 'skipped - no valid phone' });
            }
        }

        return res.status(200).json({ message: 'Reminders processed', results });
    } catch (error) {
        console.error('Error in cron job:', error.message || error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
