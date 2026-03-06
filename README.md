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

## 📝 Notas de Implementación
- El número de teléfono del paciente debe estar en la **Descripción** o **Ubicación** del evento con formato internacional (ej. `+521234567890`).
- El Cron Job se ejecuta por defecto cada minuto (configurable en `.env`) consultando las citas del día siguiente.
- Los colores del calendario cambian a:
  - **Verde (Color ID 2)**: Confirmado.
  - **Rojo (Color ID 11)**: Cancelado.
