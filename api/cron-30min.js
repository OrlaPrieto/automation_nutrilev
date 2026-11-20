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

    // Protect endpoint with a cron secret (supports query param or Vercel Cron Bearer header)
    const authHeader = req.headers.authorization;
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isQuerySecret = req.query.secret === process.env.CRON_SECRET;

    if (!isVercelCron && !isQuerySecret) {
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
            // Skip cancelled events (colorId '11')
            if (event.colorId === '11') {
                console.log(`[SKIP] Skipping cancelled urgent event (ID: ${event.id}, summary: ${event.summary || 'N/A'})`);
                results.push({ patient: event.summary, status: 'skipped - cancelled event' });
                continue;
            }

            // Skip all-day or untimed events (e.g. reminders, personal goals like "BAJAR DE PESO")
            if (!event.start || !event.start.dateTime) {
                console.log(`[SKIP] Skipping all-day or untimed event (ID: ${event.id}, summary: ${event.summary || 'N/A'})`);
                results.push({ patient: event.summary, status: 'skipped - all-day/untimed event' });
                continue;
            }

            // Extract email with smart fallback (description -> attendee -> summary)
            let email = extractEmail(event.description);
            if (!email && event.attendees && event.attendees.length > 0) {
                const nonSelfAttendee = event.attendees.find(a => !a.self && a.email && !a.email.includes('resource.calendar'));
                if (nonSelfAttendee) email = extractEmail(nonSelfAttendee.email);
            }
            if (!email && event.summary) {
                email = extractEmail(event.summary);
            }

            const patientName = (event.summary || '').replace(/\s*\(\d+\)\s*/g, '').replace(/virtual/ig, '').replace(/\s*\d+\/\d+\s*/g, '').trim();
            const startTime = moment(event.start.dateTime)
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

            console.log(`[${moment().format('HH:mm:ss')}] Processing urgent: ${patientName} (${email || 'No email'}) email... [ID: ${event.id}]`);

            if (!email) {
                console.warn(`[WARN] Skipping urgent "${patientName}": No email found.`);
                results.push({ patient: patientName, status: `skipped - no contact info` });
                continue;
            }

            if (typeof strategy.sendUrgent !== 'function') {
                console.warn(`[WARN] Strategy does not support sendUrgent.`);
                results.push({ patient: patientName, status: `skipped - missing sendUrgent method` });
                continue;
            }

            try {
                // Add a small delay between sends to avoid rate limits
                if (results.length > 0) await sleep(500);

                const response = await strategy.sendUrgent(email, patientName, startTime, event.id, event);
                console.log(`[OK] Sent urgent to ${patientName} (${email}). Resend ID: ${response?.id || 'N/A'}`);

                // Mark as sent in Redis (expires in 2 hours)
                await redis.set(sentKey, 'true', { ex: 7200 });

                results.push({ patient: patientName, contact: email, status: 'sent urgent', resendId: response?.id });
            } catch (err) {
                console.error(`[ERROR] Failed urgent for ${patientName} (${email}):`, err.message);
                results.push({ patient: patientName, contact: email, status: 'error', error: err.message });
            }
        }

        return res.status(200).json({ message: 'Urgent reminders processed', results });
    } catch (error) {
        console.error('Error in 30-min cron job:', error.message || error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
