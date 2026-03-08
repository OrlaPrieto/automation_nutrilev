const config = require('../config');

/**
 * Generates an HTML email for appointment confirmation.
 */
function generateEmailHtml({ patientName, time, event, confirmUrl, cancelUrl, calendarLink, whatsappUrl }) {
    const location = event?.location || config.clinic.location || 'Consultorio Nutrilev';
    const eventTitle = event?.summary || 'Cita';

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#fff0f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff0f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(233,30,140,0.1);">

<!-- Header -->
<tr><td style="background-color:#e91e8c;padding:36px 40px;text-align:center;">
    <h1 style="margin:0 0 4px;color:#ffffff;font-size:30px;font-weight:700;letter-spacing:-0.5px;">${config.clinic.name}</h1>
    <p style="margin:0;color:#fce4f3;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;">${config.clinic.specialty}</p>
</td></tr>

<!-- Banner -->
<tr><td style="background-color:#fce4f3;padding:18px 40px;text-align:center;border-bottom:1px solid #f9a8d4;">
    <p style="margin:0;color:#9d174d;font-size:14px;font-weight:600;">🌸 Recordatorio de Cita — Te esperamos mañana</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:40px;">
    <p style="margin:0 0 8px;color:#1a1a2e;font-size:18px;font-weight:600;">Hola, ${patientName} 👋</p>
    <p style="margin:0 0 32px;color:#6b7280;font-size:15px;line-height:1.7;">Te recordamos que tienes una cita programada para mañana. Aquí están los detalles:</p>

    <!-- Detalles -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff0f5;border-radius:12px;border:1px solid #f9a8d4;margin-bottom:32px;">
    <tr><td style="padding:28px;">
        <p style="margin:0 0 16px;color:#e91e8c;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Detalles de tu cita</p>
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;border-bottom:1px solid #fce4f3;">
                <span style="color:#6b7280;font-size:14px;">📋 Tipo de cita</span>
                <span style="color:#1a1a2e;font-size:14px;font-weight:600;float:right;">${eventTitle}</span>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #fce4f3;">
                <span style="color:#6b7280;font-size:14px;">🕐 Hora</span>
                <span style="color:#1a1a2e;font-size:14px;font-weight:600;float:right;">${time}</span>
            </td></tr>
            <tr><td style="padding:10px 0;">
                <span style="color:#6b7280;font-size:14px;">📍 Lugar</span>
                <span style="color:#1a1a2e;font-size:14px;font-weight:600;float:right;">${location}</span>
            </td></tr>
        </table>
    </td></tr>
    </table>

    <!-- Confirmar / Cancelar -->
    <p style="margin:0 0 16px;color:#e91e8c;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">¿Confirmas tu asistencia?</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
    <tr>
        <td width="50%" style="padding-right:8px;">
            <a href="${confirmUrl}" style="display:block;background-color:#e91e8c;color:#ffffff;text-decoration:none;padding:14px 0;border-radius:50px;font-size:14px;font-weight:600;text-align:center;letter-spacing:0.3px;">Confirmar asistencia</a>
        </td>
        <td width="50%" style="padding-left:8px;">
            <a href="${cancelUrl}" style="display:block;background-color:#f3f4f6;color:#6b7280;text-decoration:none;padding:14px 0;border-radius:50px;font-size:14px;font-weight:600;text-align:center;letter-spacing:0.3px;">No podré asistir</a>
        </td>
    </tr>
    </table>

    <!-- Divisor -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-top:1px solid #fce4f3;"></td></tr>
    </table>

    <!-- Calendario -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
    <tr><td align="center">
        <a href="${calendarLink}" style="display:inline-block;background-color:#1a1a2e;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:600;">📅 Agregar a mi calendario</a>
    </td></tr>
    </table>

    <!-- WhatsApp -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr><td align="center">
        <a href="${whatsappUrl}" style="display:inline-block;background-color:#25d366;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:600;">💬 Reagendar por WhatsApp</a>
    </td></tr>
    </table>
</td></tr>

<!-- Footer -->
<tr><td style="background-color:#1a1a2e;padding:28px 40px;text-align:center;">
    <p style="margin:0 0 8px;color:#f9a8d4;font-size:13px;font-weight:600;">${config.clinic.name} Especializada</p>
    <p style="margin:0 0 4px;color:#e91e8c;font-size:12px;">${config.clinic.email} · ${config.clinic.phone}</p>
    <p style="margin:12px 0 0;color:#4b5563;font-size:11px;">Este es un recordatorio automático, por favor no respondas este correo.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = { generateEmailHtml };
