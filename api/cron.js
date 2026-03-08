const moment = require('moment');
const { getGoogleAuth, getTomorrowsEvents } = require('../services/googleCalendar');
const { sendWhatsAppTemplate } = require('../services/whatsapp');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    console.log(`[${moment().format()}] Running appointment reminders job...`);

    const channel = process.env.MESSAGE_CHANNEL || 'whatsapp';

    try {
        const auth = getGoogleAuth();
        const events = await getTomorrowsEvents(auth);

        if (!events || events.length === 0) {
            console.log('No events found for tomorrow.');
            return res.status(200).json({ message: 'No events found for tomorrow.' });
        }

        const results = [];

        for (const event of events) {
            // contact field: phone number for sms/whatsapp, email for email channel
            const contact = event.description;
            const patientName = event.summary;
            const startTime = moment(event.start.dateTime || event.start.date).utcOffset('-06:00').format('HH:mm');

            console.log(`Event: ${patientName}, Contact: ${contact}, Channel: ${channel}`);

            const isValidPhone = contact && contact.startsWith('+');
            const isValidEmail = contact && contact.includes('@');
            const isValid = channel === 'email' ? isValidEmail : isValidPhone;

            if (isValid) {
                console.log(`Sending reminder to ${patientName} at ${contact}...`);
                await sendWhatsAppTemplate(contact, patientName, startTime, event.id, event);
                results.push({ patient: patientName, contact, status: 'sent' });
            } else {
                console.warn(`Invalid contact for channel "${channel}": ${contact}`);
                results.push({ patient: patientName, status: `skipped - invalid contact for ${channel}` });
            }
        }

        return res.status(200).json({ message: 'Reminders processed', results });
    } catch (error) {
        console.error('Error in cron job:', error.message || error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};