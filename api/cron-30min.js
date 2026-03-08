const moment = require('moment');
const calendar = require('../src/services/google-calendar');
const ReminderFactory = require('../src/reminders/factory');
const config = require('../src/config');
const redis = require('../src/services/redis');

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
        // Look for events starting between 25 and 40 minutes from NOW
        const timeMin = moment().add(25, 'minutes').toISOString();
        const timeMax = moment().add(40, 'minutes').toISOString();

        const events = await calendar.getEvents(timeMin, timeMax);

        if (events.length === 0) {
            console.log('No events found starting in ~30 mins.');
            return res.status(200).json({ message: 'No upcoming events.' });
        }

        const strategy = ReminderFactory.getStrategy();
        const results = [];

        for (const event of events) {
            const contact = event.description;
            const patientName = event.summary;
            const startTime = moment(event.start.dateTime || event.start.date)
                .utcOffset('-06:00')
                .format('HH:mm');

            // Prevent duplicate sends for the same event
            const sentKey = `urgent_sent_${event.id}`;
            const alreadySent = await redis.get(sentKey);

            if (alreadySent) {
                console.log(`Skipping event ${event.id}, reminder already sent.`);
                results.push({ patient: patientName, status: 'skipped - already sent' });
                continue;
            }

            const isValid = contact && contact.includes('@');

            if (isValid && typeof strategy.sendUrgent === 'function') {
                try {
                    console.log(`Sending urgent 30-min reminder to ${patientName} at ${contact}...`);
                    await strategy.sendUrgent(contact, patientName, startTime, event.id, event);

                    // Mark as sent in Redis (expires in 2 hours)
                    await redis.set(sentKey, 'true', { ex: 7200 });

                    results.push({ patient: patientName, contact, status: 'sent urgent' });
                } catch (err) {
                    console.error(`Failed to send urgent reminder to ${patientName}:`, err.message);
                    results.push({ patient: patientName, contact, status: 'error', error: err.message });
                }
            } else {
                console.warn(`Invalid contact or strategy missing sendUrgent: ${contact}`);
                results.push({ patient: patientName, status: `skipped - invalid for urgent` });
            }
        }

        return res.status(200).json({ message: 'Urgent reminders processed', results });
    } catch (error) {
        console.error('Error in 30-min cron job:', error.message || error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
