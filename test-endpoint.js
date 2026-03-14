require('dotenv').config();
const handler = require('./api/cron-30min');
const req = {
    method: 'GET',
    query: { secret: process.env.CRON_SECRET }
};
const res = {
    status: (s) => ({
        send: (text) => console.log('Status', s, text),
        json: (data) => console.log('Status', s, JSON.stringify(data))
    })
};
handler(req, res).then(() => console.log('done')).catch(e => console.error(e));
