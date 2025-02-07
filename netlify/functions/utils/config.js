const path = require('path')
const dotenv = require('dotenv')

function loadEnvironmentConfig() {
    const env = process.env.NODE_ENV || 'development'
    
    // Load environment specific variables
    const envPath = path.resolve(process.cwd(), `.env.${env}`)
    const envConfig = dotenv.config({ path: envPath })
    
    if (envConfig.error) {
        console.warn(`Warning: .env.${env} file not found`)
    }

    // Configuration object
    return {
        env,
        logging: {
            level: process.env.LOG_LEVEL || {
                development: 'debug',
                staging: 'warn',
                production: 'error'
            }[env] || 'warn',
            requestBody: process.env.LOG_REQUEST_BODY === 'true' || env === 'development',
            responseBody: process.env.LOG_RESPONSE_BODY === 'true' || env === 'development'
        },
        cache: {
            enabled: process.env.CACHE_ENABLED === 'true',
            ttl: parseInt(process.env.CACHE_TTL) || {
                development: 1800,  // 30 minutes
                staging: 3600,      // 1 hour
                production: 7200    // 2 hours
            }[env] || 3600
        },
        performance: {
            compression: env === 'production',
            rateLimit: {
                enabled: env === 'production',
                window: 900000,  // 15 minutes
                max: 100        // max requests per window
            }
        }
    }
}

module.exports = loadEnvironmentConfig()
