const moment = require('moment');
const calendar = require('../src/services/google-calendar');
const ReminderFactory = require('../src/reminders/factory');
const config = require('../src/config');
const { extractEmail } = require('../src/utils/email');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    console.log(`[${moment().format()}] Running appointment reminders job...`);

    try {
        // 1. Get tomorrow's events (forcing Mexico City time for calculation)
        // 1. Determine target date (Monday reminders are sent on Saturday, Sunday is skipped)
        const now = moment().utcOffset('-06:00');
        const dayOfWeek = now.day(); // 0: Sunday, 6: Saturday

        let daysToAdd = 1;
        if (dayOfWeek === 6) {
            daysToAdd = 2; // On Saturday, send for Monday
        } else if (dayOfWeek === 0) {
            console.log('Skipping Sunday run. Monday reminders were sent on Saturday.');
            return res.status(200).json({ message: 'Skipping Sunday run. Monday reminders were sent on Saturday.' });
        }

        const timeMin = now.clone().add(daysToAdd, 'days').startOf('day').toISOString();
        const timeMax = now.clone().add(daysToAdd, 'days').endOf('day').toISOString();

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
                .format('h:mm A');

            console.log(`[${moment().format('HH:mm:ss')}] Processing: ${patientName} (${contact || 'No contact info'}) email... [ID: ${event.id}]`);
            
            if (!contact) {
                console.warn(`[WARN] Skipping "${patientName}": No email found.`);
                results.push({ patient: patientName, status: `skipped - no contact info` });
                continue;
            }

            if (!contact.includes('@')) {
                console.warn(`[WARN] Skipping "${patientName}": Invalid email format "${contact}"`);
                results.push({ patient: patientName, status: `skipped - invalid contact` });
                continue;
            }

            try {
                // Clean contact email if it exists
                const cleanContact = extractEmail(contact);
                const targetDay = (dayOfWeek === 6) ? 'el lunes' : 'mañana';

                // Add a small delay between sends to avoid rate limits
                if (results.length > 0) await sleep(500);

                const response = await strategy.send(cleanContact || contact, patientName, startTime, event.id, event, targetDay);
                console.log(`[OK] Sent to ${patientName} (${cleanContact || contact}). Resend ID: ${response?.id || 'N/A'}`);
                results.push({ patient: patientName, contact: cleanContact || contact, status: 'sent', resendId: response?.id });
            } catch (err) {
                console.error(`[ERROR] Failed for ${patientName} (${contact}):`, err.message);
                results.push({ patient: patientName, contact, status: 'error', error: err.message });
            }
        }

        return res.status(200).json({ message: 'Reminders processed', results });
    } catch (error) {
        console.error('Error in cron job:', error.message || error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};