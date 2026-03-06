const cron = require('node-cron');
const moment = require('moment');
const { getGoogleAuth, getTomorrowsEvents } = require('../services/googleCalendar');
const { sendWhatsAppTemplate } = require('../services/whatsapp');

/**
 * Scheduled task to send appointment reminders for tomorrow.
 */
function setupCronJobs() {
    // Execute every minute for testing/confirmation
    const schedule = process.env.CRON_SCHEDULE || '* * * * *';

    cron.schedule(schedule, async () => {
        console.log(`[${moment().format()}] Running appointment reminders job...`);

        try {
            const auth = getGoogleAuth();
            const events = await getTomorrowsEvents(auth);

            if (!events || events.length === 0) {
                console.log('No events found for tomorrow.');
                return;
            }

            for (const event of events) {
                // The phone number should be in the Description or Location field.
                // We're assuming it's in the description for this example.
                const phoneNumber = event.description || event.location;
                const patientName = event.summary;
                const startTime = moment(event.start.dateTime || event.start.date).format('HH:mm');

                if (phoneNumber && phoneNumber.startsWith('+')) {
                    console.log(`Sending reminder to ${patientName} at ${phoneNumber}...`);
                    await sendWhatsAppTemplate(phoneNumber, patientName, startTime, event.id);
                } else {
                    console.warn(`Missing or invalid phone number for event: ${event.summary}`);
                }
            }
        } catch (error) {
            console.error('Error in cron job:', error);
        }
    }, {
        scheduled: true,
        timezone: "America/Mexico_City"
    });

    console.log(`Cron job scheduled with pattern: ${schedule}`);
}

module.exports = {
    setupCronJobs
};
