
module.exports = pkg => ({
    description: pkg.description,
    env: {
        pattern: {
            description: 'the matching pattern for Redis scan',
            example: '*'
        },
        limit: {
            description: 'the maximum number of keys to print',
            note: 'zero means unlimited',
            default: 30
        },
        port: {
            description: 'the Redis host port',
            default: 6379
        },
        host: {
            description: 'the Redis host address',
            default: 'localhost'
        },
        password: {
            description: 'the Redis host password',
            required: false
        },
        scanCount: {
            description: 'the count for scan',
            default: 100,
        },
        logging: {
            description: 'the logging level',
            default: 'info'
        }
    }
});
