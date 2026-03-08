const config = require('../config');

/**
 * Generates an HTML email for urgent appointment reminders (e.g. 30 mins before)
 */
function generateUrgentEmailHtml({ patientName, time, event, calendarLink, whatsappUrl }) {
    const location = event?.location || config.clinic.location || 'Consultorio Nutrilev';
    const eventTitle = event?.summary || 'Cita';

    // Make a Google Maps link search for the location
    const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#fff0f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff0f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;border:3px solid #e91e8c;overflow:hidden;box-shadow:0 8px 30px rgba(233,30,140,0.15);">

<!-- Header -->
<tr><td style="background-color:#e91e8c;padding:30px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">⏰ ¡Tu cita está por comenzar!</h1>
</td></tr>

<!-- Body -->
<tr><td style="padding:40px;">
    <p style="margin:0 0 8px;color:#1a1a2e;font-size:18px;font-weight:600;">Hola, ${patientName}</p>
    <p style="margin:0 0 24px;color:#e91e8c;font-size:16px;font-weight:bold;">¡Te esperamos en aproximadamente 30 minutos!</p>
    <p style="margin:0 0 32px;color:#6b7280;font-size:15px;line-height:1.7;">Queremos asegurarnos de que llegues sin problemas. Aquí tienes las indicaciones:</p>

    <!-- Detalles con el Mapa -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f8;border-radius:12px;margin-bottom:32px;">
    <tr><td style="padding:28px;text-align:center;">
        <p style="margin:0 0 8px;color:#6b7280;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Ubicación de tu cita</p>
        <p style="margin:0 0 20px;color:#1a1a2e;font-size:18px;font-weight:700;">${location}</p>
        
        <a href="${mapSearchUrl}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:50px;font-size:15px;font-weight:600;">📍 Abrir en Google Maps</a>
    </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td style="padding:15px;border-top:1px solid #fce4f3;text-align:center;">
            <p style="margin:0;color:#6b7280;font-size:14px;">Hora de la cita: <strong style="color:#1a1a2e;">${time}</strong></p>
        </td>
    </tr>
    <tr>
        <td style="padding:15px;border-top:1px solid #fce4f3;text-align:center;">
            <p style="margin:0;color:#6b7280;font-size:14px;">Motivo: <strong style="color:#1a1a2e;">${eventTitle}</strong></p>
        </td>
    </tr>
    </table>

    <!-- Advertencia Reagendar -->
    <p style="margin:30px 0 0;text-align:center;color:#6b7280;font-size:13px;line-height:1.5;">
        Si tienes algún contratiempo de última hora, por favor <a href="${whatsappUrl}" style="color:#25d366;font-weight:bold;text-decoration:none;">avísanos por WhatsApp</a>.
    </p>

</td></tr>

<!-- Footer -->
<tr><td style="background-color:#1a1a2e;padding:24px 40px;text-align:center;">
    <p style="margin:0 0 4px;color:#fce4f3;font-size:13px;font-weight:600;">${config.clinic.name} Especializada</p>
    <p style="margin:0;color:#f9a8d4;font-size:12px;">${config.clinic.phone}</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = { generateUrgentEmailHtml };
