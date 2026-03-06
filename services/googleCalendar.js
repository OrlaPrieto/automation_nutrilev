const { google } = require('googleapis');
const moment = require('moment');

/**
 * Get tomorrow's events from Google Calendar.
 * @param {google.auth.OAuth2 | google.auth.JWT} auth Authenticated Google API client.
 * @returns {Promise<Array>} List of events.
 */
async function getTomorrowsEvents(auth) {
    const calendar = google.calendar({ version: 'v3', auth });

    // Calculate start and end of tomorrow
    const timeMin = moment().add(1, 'days').startOf('day').toISOString();
    const timeMax = moment().add(1, 'days').endOf('day').toISOString();

    const response = await calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime',
    });

    return response.data.items;
}

/**
 * Update the color of a Google Calendar event.
 * @param {string} eventId The ID of the event to update.
 * @param {string} colorId The color ID (e.g., '2' for green, '11' for red).
 * @param {google.auth.OAuth2 | google.auth.JWT} auth Authenticated Google API client.
 */
async function updateCalendarEventColor(eventId, colorId, auth) {
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.patch({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId: eventId,
        requestBody: {
            colorId: colorId // 2=Green (Confirmed), 11=Red (Cancelled)
        }
    });
}

/**
 * Initialize Google Auth using a Service Account.
 * Supports both file-based credentials (local dev) and
 * JSON env var credentials (Vercel / serverless).
 */
function getGoogleAuth() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];

    // If GOOGLE_CREDENTIALS_JSON is set (Vercel), parse it and use it directly
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes,
        });
        return auth;
    }

    // Fallback: local dev with keyFile
    const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes,
    });
    return auth;
}

module.exports = {
    getTomorrowsEvents,
    updateCalendarEventColor,
    getGoogleAuth
};
