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

    // Protect endpoint with a cron secret if configured (supports query param or Vercel Cron Bearer header)
    const authHeader = req.headers.authorization;
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isQuerySecret = req.query.secret === process.env.CRON_SECRET;

    if (process.env.CRON_SECRET && !isVercelCron && !isQuerySecret) {
        return res.status(401).send('Unauthorized');
    }

    console.log(`[${moment().format()}] Running appointment reminders job...`);

    try {
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
            // Skip cancelled events (colorId '11')
            if (event.colorId === '11') {
                console.log(`[SKIP] Skipping cancelled event (ID: ${event.id}, summary: ${event.summary || 'N/A'})`);
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

            // Prevent duplicate reminder sends (expires in 24 hours)
            const sentKey = `reminder_sent_${event.id}`;
            const alreadySent = await redis.get(sentKey);

            if (alreadySent) {
                console.log(`Skipping event ${event.id}, reminder already sent.`);
                results.push({ patient: patientName, status: 'skipped - already sent' });
                continue;
            }

            console.log(`[${moment().format('HH:mm:ss')}] Processing: ${patientName} (${email || 'No email'}) email... [ID: ${event.id}]`);
            
            if (!email) {
                console.warn(`[WARN] Skipping "${patientName}": No email found.`);
                results.push({ patient: patientName, status: `skipped - no contact info` });
                continue;
            }

            try {
                const targetDay = (dayOfWeek === 6) ? 'el lunes' : 'mañana';

                // Add a small delay between sends to avoid rate limits
                if (results.length > 0) await sleep(500);

                const response = await strategy.send(email, patientName, startTime, event.id, event, targetDay);
                console.log(`[OK] Sent to ${patientName} (${email}). Resend ID: ${response?.id || 'N/A'}`);

                // Mark as sent in Redis (expires in 24 hours)
                await redis.set(sentKey, 'true', { ex: 86400 });

                results.push({ patient: patientName, contact: email, status: 'sent', resendId: response?.id });
            } catch (err) {
                console.error(`[ERROR] Failed for ${patientName} (${email}):`, err.message);
                results.push({ patient: patientName, contact: email, status: 'error', error: err.message });
            }
        }

        return res.status(200).json({ message: 'Reminders processed', results });
    } catch (error) {
        console.error('Error in cron job:', error.message || error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
