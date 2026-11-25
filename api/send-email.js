const moment = require('moment');
const calendar = require('../src/services/google-calendar');
const ReminderFactory = require('../src/reminders/factory');
const config = require('../src/config');
const { extractEmail } = require('../src/utils/email');

module.exports = async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Security check
    if (req.query.secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { eventId, email, patientName, time, urgent } = req.body;

    try {
        let finalEmail = email;
        let finalPatientName = patientName;
        let finalTime = time;
        let event = null;

        // Mode 1: Event ID
        if (eventId) {
            console.log(`[Manual] Fetching event ${eventId} from Google Calendar...`);
            event = await calendar.getEvent(eventId);
            
            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

            // Extract contact
            let contact = event.description;
            if (!contact && event.attendees && event.attendees.length > 0) {
                const nonSelfAttendee = event.attendees.find(a => !a.self && a.email && !a.email.includes('resource.calendar'));
                if (nonSelfAttendee) contact = nonSelfAttendee.email;
            }

            finalEmail = extractEmail(contact) || contact;
            finalPatientName = (event.summary || '').replace(/\s*\(\d+\)\s*/g, '').replace(/virtual/ig, '').replace(/\s*\d+\/\d+\s*/g, '').trim();
            finalTime = moment(event.start.dateTime || event.start.date)
                .utcOffset('-06:00')
                .format('h:mm A');
        }

        // Validate required fields
        if (!finalEmail || !finalEmail.includes('@')) {
            return res.status(400).json({ error: 'Invalid or missing email', details: { email: finalEmail } });
        }
        if (!finalPatientName) {
            return res.status(400).json({ error: 'Missing patient name' });
        }
        if (!finalTime) {
            return res.status(400).json({ error: 'Missing time' });
        }

        // Send the email
        const strategy = ReminderFactory.getStrategy('email');
        let response;

        if (urgent && typeof strategy.sendUrgent === 'function') {
            console.log(`[Manual] Sending urgent email to ${finalPatientName} (${finalEmail})...`);
            response = await strategy.sendUrgent(finalEmail, finalPatientName, finalTime, eventId || 'manual', event);
        } else {
            console.log(`[Manual] Sending reminder email to ${finalPatientName} (${finalEmail})...`);
            response = await strategy.send(finalEmail, finalPatientName, finalTime, eventId || 'manual', event);
        }

        return res.status(200).json({
            message: 'Email sent successfully',
            data: {
                recipient: finalEmail,
                patient: finalPatientName,
                time: finalTime,
                resendId: response?.id
            }
        });

    } catch (error) {
        console.error('[Manual Error]:', error.message || error);
        return res.status(500).json({ 
            error: 'Failed to send email', 
            message: error.message 
        });
    }
};
