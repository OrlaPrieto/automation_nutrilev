const moment = require('moment');
const { getGoogleAuth, getTomorrowsEvents } = require('../services/googleCalendar');
const { sendWhatsAppTemplate } = require('../services/whatsapp');

module.exports = async function handler(req, res) {
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

        return res.status(200).send('Reminders processed.');
    } catch (error) {
        console.error('Error in cron job:', error);
        return res.status(500).send('Error processing reminders.');
    }
};