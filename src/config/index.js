require('dotenv').config();

module.exports = {
    baseUrl: process.env.BASE_URL || 'https://automation-nutrilev.vercel.app',
    port: process.env.PORT || 3000,
    messageChannel: process.env.MESSAGE_CHANNEL || 'whatsapp',

    google: {
        credentialsJson: process.env.GOOGLE_CREDENTIALS_JSON,
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json',
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    },

    whatsapp: {
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'recordatorio_cita',
    },

    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        templateSid: process.env.TWILIO_TEMPLATE_SID,
    },

    redis: {
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    },

    resend: {
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.EMAIL_FROM || `${process.env.CLINIC_NAME || 'Nutrilev'} <onboarding@resend.dev>`,
        replyTo: process.env.CLINIC_EMAIL || 'nutrilev@outlook.es',
    },

    clinic: {
        name: 'Nutrilev',
        specialty: 'Nutrición Clínica Especializada',
        email: 'nutrilev@outlook.es',
        phone: '+52 (614) 395-8598',
    }
};
