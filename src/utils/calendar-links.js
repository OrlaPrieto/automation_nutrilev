/**
 * Utility functions for Google Calendar integration.
 */

function generateCalendarLink(event) {
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d{3}/, '');
    }

    const start = formatDate(event.start.dateTime || event.start.date);
    const end = formatDate(event.end.dateTime || event.end.date);

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: (event.summary || '').replace(/\s*\(\d+\)\s*/g, '').replace(/virtual/ig, '').replace(/\s*\d+\/\d+\s*/g, '').trim() || 'Cita',
        dates: `${start}/${end}`,
        details: event.description || '',
        location: event.location || ''
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

module.exports = {
    generateCalendarLink,
};
