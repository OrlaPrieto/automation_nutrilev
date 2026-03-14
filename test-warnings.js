const packages = [
    '@upstash/redis',
    'axios',
    'dotenv',
    'express',
    'googleapis',
    'moment',
    'node-cron',
    'resend',
    'twilio'
];

for (const pkg of packages) {
    try {
        require(pkg);
        console.log(`Loaded ${pkg}`);
    } catch (e) {
        console.error(`Error loading ${pkg}: ${e.message}`);
    }
}
