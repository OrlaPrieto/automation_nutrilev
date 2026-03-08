const { google } = require('googleapis');
const config = require('../config');

/**
 * Initialize Google Auth using a Service Account.
 */
function getGoogleAuth() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];

    if (config.google.credentialsJson) {
        const credentials = JSON.parse(config.google.credentialsJson);
        return new google.auth.GoogleAuth({
            credentials,
            scopes,
        });
    }

    return new google.auth.GoogleAuth({
        keyFile: config.google.keyFile,
        scopes,
    });
}

/**
 * Get events for a specific date range.
 */
async function getEvents(timeMin, timeMax) {
    const auth = getGoogleAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
        calendarId: config.google.calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
    });

    return response.data.items || [];
}

/**
 * Update the color of a Google Calendar event.
 */
async function updateEventColor(eventId, colorId) {
    const auth = getGoogleAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.patch({
        calendarId: config.google.calendarId,
        eventId,
        requestBody: { colorId }
    });
}

module.exports = {
    getEvents,
    updateEventColor,
};
