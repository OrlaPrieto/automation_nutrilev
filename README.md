# Sistema de Confirmación Automática de Citas

Este proyecto automatiza la confirmación de citas de Google Calendar mediante mensajes interactivos de WhatsApp utilizando la API oficial de Meta.

## 🚀 Inicio Rápido

### 1. Requisitos Previos
- Node.js instalado (v16+)
- Una cuenta de Google Cloud Console
- Una cuenta de Meta for Developers (WhatsApp Business API)
- Un servidor con HTTPS para el Webhook (puedes usar `ngrok` para pruebas locales)

### 2. Instalación
```bash
# Clonar el repositorio
git clone <url-del-repo>
cd automation_nutrilev

# Instalar dependencias
npm install
```

### 3. Configuración de Variables de Entorno
Copia el archivo de ejemplo y rellena los valores:
```bash
cp .env.example .env
```

## 🔑 Generación de Credenciales

### Google Calendar API
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto nuevo.
3. Habilita la **Google Calendar API**.
4. Ve a **Credenciales** -> **Crear credenciales** -> **Cuenta de servicio**.
5. Ponle un nombre y sigue los pasos hasta finalizar.
6. En la lista de Cuentas de Servicio, haz clic en la que creaste -> **Claves** -> **Agregar clave** -> **Crear clave nueva (JSON)**.
7. Descarga el archivo y guárdalo en la raíz del proyecto como `google-credentials.json`.
8. **IMPORTANTE**: Copia el email de la cuenta de servicio y compártele el calendario que quieres usar (en la configuración del calendario en Google Calendar, sección "Compartir con personas específicas").

### WhatsApp Cloud API (Meta for Developers)
1. Ve a [Meta for Developers](https://developers.facebook.com/).
2. Crea una App de tipo "Business".
3. Agrega el producto **WhatsApp**.
4. En **Configuración de WhatsApp** -> **Configuración de API**, obtendrás el `PHONE_NUMBER_ID` y un token temporal.
5. Genera un **System User Access Token** permanente desde el Business Manager para `WHATSAPP_ACCESS_TOKEN`.
6. Crea una plantilla de mensaje llamada `recordatorio_cita` con:
   - **Cuerpo:** "Hola {{1}}, te recordamos tu cita para mañana a las {{2}}. ¿Confirmas tu asistencia?"
   - **Botones (Quick Reply):** "Sí, confirmo ✅" y "No podré asistir ❌"
7. En la sección **Configuración** -> **Webhooks**, configura la URL de tu server (ej. `https://tuservidor.com/webhook`) y el `WHATSAPP_VERIFY_TOKEN` que definiste en tu `.env`.

## 🛠️ Ejecución
```bash
# Iniciar el servidor de Webhook y el Cron Job
node index.js
```

## 📧 Cambio de Cuenta de Correo y Calendario

Si decides cambiar de cuenta de correo o de calendario, sigue estos pasos:

### 1. Cambiar el "Sender" de Email (Resend)
Si usas **Resend** para enviar correos:
1. Registra tu nuevo dominio o correo en [Resend Domains](https://resend.com/domains) y verifícalo.
2. Actualiza la variable `RESEND_API_KEY` en Vercel/.env con la nueva API Key.
3. Actualiza la variable `CLINIC_EMAIL` o el campo `clinic.email` en `src/config/index.js` con la nueva dirección.

### 2. Cambiar la Cuenta de Google Calendar
1. En el nuevo calendario de Google, ve a **Configuración y uso compartido**.
2. En **Compartir con personas específicas**, agrega el email de tu **Cuenta de Servicio** (el que termina en `.iam.gserviceaccount.com`) con permiso de "Realizar cambios en eventos".
3. Copia el **ID del calendario** (suele ser tu email o una cadena larga terminada en `@group.calendar.google.com`).
4. Actualiza la variable `GOOGLE_CALENDAR_ID` en Vercel/.env.

### 3. Actualizar Variables de Entorno
Asegúrate de actualizar estos valores en tu panel de **Vercel** > **Settings** > **Environment Variables** para que los cambios surtan efecto en producción:
- `CLINIC_EMAIL`: El nuevo correo de contacto.
- `RESEND_API_KEY`: Si cambias de cuenta de Resend.
- `GOOGLE_CALENDAR_ID`: El ID del nuevo calendario.
- `GOOGLE_CREDENTIALS_JSON`: Solo si decides usar una Cuenta de Servicio de un proyecto de Google Cloud diferente.
