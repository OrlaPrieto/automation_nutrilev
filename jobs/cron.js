const cron = require('node-cron');
const moment = require('moment');
const { getGoogleAuth, getTomorrowsEvents } = require('../services/googleCalendar');
const { sendWhatsAppTemplate } = require('../services/whatsapp');

/**
 * Scheduled task to send appointment reminders for tomorrow.
 */
function setupCronJobs() {
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
                // Phone number is stored in Description, location has the address
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