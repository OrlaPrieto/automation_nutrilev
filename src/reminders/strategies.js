const config = require('../config');
const twilio = require('../services/twilio');
const resend = require('../services/resend');
const redis = require('../services/redis');
const { generateEmailHtml } = require('../templates/email');
const { generateCalendarLink } = require('../utils/calendar-links');

/**
 * Base Reminder Strategy
 */
class ReminderStrategy {
    async send(contact, patientName, time, eventId, event) {
        throw new Error('Strategy must implement send()');
    }
}

/**
 * WhatsApp Strategy (via Twilio)
 */
class WhatsAppStrategy extends ReminderStrategy {
    async send(contact, patientName, time, eventId) {
        // Store eventId in Redis for webhook lookup
        await redis.set(`cita:${contact}`, eventId, { ex: 86400 });
        return twilio.sendWhatsApp(contact, patientName, time);
    }
}

/**
 * SMS Strategy (via Twilio)
 */
class SMSStrategy extends ReminderStrategy {
    async send(contact, patientName, time, _, event) {
        const calendarLink = event ? generateCalendarLink(event) : '';
        const message = `Hola ${patientName}, te recordamos que tienes una cita mañana a las ${time}.\n\n` +
            (calendarLink ? `Agregar a tu calendario: ${calendarLink}` : '');

        return twilio.sendSMS(contact, message);
    }
}

/**
 * Email Strategy (via Resend)
 */
class EmailStrategy extends ReminderStrategy {
    async send(contact, patientName, time, eventId, event) {
        const calendarLink = event ? generateCalendarLink(event) : '#';
        const confirmUrl = `${config.baseUrl}/api/webhook?action=CONFIRM&eventId=${eventId}`;
        const cancelUrl = `${config.baseUrl}/api/webhook?action=CANCEL&eventId=${eventId}`;
        const whatsappUrl = `https://wa.me/${config.clinic.phone.replace(/\D/g, '')}?text=Hola%2C%20me%20gustar%C3%ADa%20reagendar%20mi%20cita.`;

        const html = generateEmailHtml({
            patientName,
            time,
            event,
            confirmUrl,
            cancelUrl,
            calendarLink,
            whatsappUrl,
        });

        return resend.sendEmail({
            to: contact,
            subject: `🍎 ${config.clinic.name} | Confirma tu cita de mañana`,
            html,
        });
    }

    async sendUrgent(contact, patientName, time, eventId, event) {
        const { generateUrgentEmailHtml } = require('../templates/email-urgent');
        const calendarLink = event ? generateCalendarLink(event) : '#';
        const whatsappUrl = `https://wa.me/${config.clinic.phone.replace(/\D/g, '')}?text=Hola%2C%20tengo%20un%20contratiempo%20con%20mi%20cita%20de%20hoy.`;

        const html = generateUrgentEmailHtml({
            patientName,
            time,
            event,
            calendarLink,
            whatsappUrl,
        });

        return resend.sendEmail({
            to: contact,
            subject: `⏰ Tu cita en ${config.clinic.name} comienza pronto!`,
            html,
        });
    }
}

module.exports = {
    WhatsAppStrategy,
    SMSStrategy,
    EmailStrategy,
};
