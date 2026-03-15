const moment = require('moment');
const calendar = require('../src/services/google-calendar');
const ReminderFactory = require('../src/reminders/factory');
const config = require('../src/config');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    console.log(`[${moment().format()}] Running appointment reminders job...`);

    try {
        // 1. Get tomorrow's events (forcing Mexico City time for calculation)
        const timeMin = moment().utcOffset('-06:00').add(1, 'days').startOf('day').toISOString();
        const timeMax = moment().utcOffset('-06:00').add(1, 'days').endOf('day').toISOString();

        const events = await calendar.getEvents(timeMin, timeMax);

        if (events.length === 0) {
            console.log('No events found for tomorrow.');
            return res.status(200).json({ message: 'No events found for tomorrow.' });
        }

        // 2. Get the strategy for the configured channel
        const strategy = ReminderFactory.getStrategy();
        const results = [];

        // 3. Process each event
        for (const event of events) {
            let contact = event.description;
            
            // Fallback to searching attendees if description is empty
            if (!contact && event.attendees && event.attendees.length > 0) {
                const nonSelfAttendee = event.attendees.find(a => !a.self && a.email && !a.email.includes('resource.calendar'));
                if (nonSelfAttendee) contact = nonSelfAttendee.email;
            }

            const patientName = (event.summary || '').replace(/\s*\(\d+\)\s*/g, '').replace(/virtual/ig, '').replace(/\s*\d+\/\d+\s*/g, '').trim();
            const startTime = moment(event.start.dateTime || event.start.date)
                .utcOffset('-06:00')
                .format('HH:mm');

            console.log(`Processing: ${patientName} (${contact || 'No contact info'}) via ${config.messageChannel}`);

            // Basic validation based on channel
            const isValid = config.messageChannel === 'email'
                ? (contact && contact.includes('@'))
                : (contact && contact.startsWith('+'));

            if (!contact) {
                console.warn(`Skipping event "${patientName}" (${event.id}): No contact info found in description or attendees.`);
                results.push({ patient: patientName, status: `skipped - no contact info` });
            } else if (!isValid) {
                console.warn(`Skipping event "${patientName}" (${event.id}): Invalid contact format for channel "${config.messageChannel}": "${contact}"`);
                results.push({ patient: patientName, status: `skipped - invalid contact` });
            } else {
                try {
                    await strategy.send(contact, patientName, startTime, event.id, event);
                    results.push({ patient: patientName, contact, status: 'sent' });
                } catch (err) {
                    console.error(`Failed to send reminder to ${patientName}:`, err.message);
                    results.push({ patient: patientName, contact, status: 'error', error: err.message });
                }
            }
        }

        return res.status(200).json({ message: 'Reminders processed', results });
    } catch (error) {
        console.error('Error in cron job:', error.message || error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};