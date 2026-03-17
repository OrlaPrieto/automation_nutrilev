const moment = require('moment');
const calendar = require('../src/services/google-calendar');
const config = require('../src/config');

module.exports = async function handler(req, res) {
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Security check
    if (req.query.secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { days = 1 } = req.query;

    try {
        // Get events (Central Time)
        const timeMin = moment().utcOffset('-06:00').startOf('day').toISOString();
        const timeMax = moment().utcOffset('-06:00').add(parseInt(days), 'days').endOf('day').toISOString();

        const events = await calendar.getEvents(timeMin, timeMax);

        const summary = events.map(event => ({
            id: event.id,
            summary: event.summary,
            start: event.start.dateTime || event.start.date,
            contact: event.description || (event.attendees ? event.attendees.find(a => !a.self)?.email : 'N/A')
        }));

        return res.status(200).json({
            count: events.length,
            timeWindow: { from: timeMin, to: timeMax },
            events: summary
        });

    } catch (error) {
        console.error('[List Events Error]:', error.message || error);
        return res.status(500).json({ 
            error: 'Failed to list events', 
            message: error.message 
        });
    }
};
