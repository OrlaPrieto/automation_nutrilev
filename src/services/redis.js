const { Redis } = require('@upstash/redis');
const config = require('../config');

const redis = new Redis({
    url: config.redis.url,
    token: config.redis.token,
});

module.exports = {
    get: async (key) => redis.get(key),
    set: async (key, value, options) => redis.set(key, value, options),
    del: async (key) => redis.del(key),
};
