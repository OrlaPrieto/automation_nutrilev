const moment = require('moment');
const calendar = require('../src/services/google-calendar');
const ReminderFactory = require('../src/reminders/factory');
const config = require('../src/config');
const redis = require('../src/services/redis');
const { extractEmail } = require('../src/utils/email');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    // Protect endpoint with a cron secret so not anyone can trigger it
    if (req.query.secret !== process.env.CRON_SECRET) {
        return res.status(401).send('Unauthorized');
    }

    console.log(`[${moment().format()}] Running 30-min urgent reminders job...`);

    if (config.messageChannel !== 'email') {
        return res.status(200).json({ message: 'Urgent reminders currently only implemented for email channel.' });
    }

    try {
        // Look for events starting between 25 and 40 minutes from NOW (Central Time)
        const timeMin = moment().utcOffset('-06:00').add(25, 'minutes').toISOString();
        const timeMax = moment().utcOffset('-06:00').add(40, 'minutes').toISOString();

        const events = await calendar.getEvents(timeMin, timeMax);

        if (events.length === 0) {
            console.log('No events found starting in ~30 mins.');
            return res.status(200).json({ message: 'No upcoming events.' });
        }

        const strategy = ReminderFactory.getStrategy();
        const results = [];

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

            // Prevent duplicate sends for the same event
            const sentKey = `urgent_sent_${event.id}`;
            const alreadySent = await redis.get(sentKey);

            if (alreadySent) {
                console.log(`Skipping event ${event.id}, reminder already sent.`);
                results.push({ patient: patientName, status: 'skipped - already sent' });
                continue;
            }

            console.log(`[${moment().format('HH:mm:ss')}] Processing urgent: ${patientName} (${contact}) email... [ID: ${event.id}]`);

            if (!contact) {
                console.warn(`[WARN] Skipping urgent "${patientName}": No email found.`);
                results.push({ patient: patientName, status: `skipped - no contact info` });
                continue;
            }

            if (!contact.includes('@')) {
                console.warn(`[WARN] Skipping urgent "${patientName}": Invalid email format "${contact}"`);
                results.push({ patient: patientName, status: `skipped - invalid contact` });
                continue;
            }

            if (typeof strategy.sendUrgent !== 'function') {
                console.warn(`[WARN] Strategy does not support sendUrgent.`);
                results.push({ patient: patientName, status: `skipped - missing sendUrgent method` });
                continue;
            }

            try {
                // Clean contact email if it exists
                const cleanContact = extractEmail(contact);

                // Add a small delay between sends to avoid rate limits
                if (results.length > 0) await sleep(500);

                const response = await strategy.sendUrgent(cleanContact || contact, patientName, startTime, event.id, event);
                console.log(`[OK] Sent urgent to ${patientName} (${cleanContact || contact}). Resend ID: ${response?.id || 'N/A'}`);

                // Mark as sent in Redis (expires in 2 hours)
                await redis.set(sentKey, 'true', { ex: 7200 });

                results.push({ patient: patientName, contact: cleanContact || contact, status: 'sent urgent', resendId: response?.id });
            } catch (err) {
                console.error(`[ERROR] Failed urgent for ${patientName} (${contact}):`, err.message);
                results.push({ patient: patientName, contact, status: 'error', error: err.message });
            }
        }

        return res.status(200).json({ message: 'Urgent reminders processed', results });
    } catch (error) {
        console.error('Error in 30-min cron job:', error.message || error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
