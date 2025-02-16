const config = require('./config')

// Log levels hierarchy
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
}

// Should this level be logged in current environment?
function shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[config.logging.level]
}

// Sanitize sensitive data
function sanitizeData(data) {
    if (!data) return data
    
    const sanitized = { ...data }
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'hashedPassword', 'token', 'authorization', 'apiKey']
    sensitiveFields.forEach(field => {
        if (field in sanitized) {
            sanitized[field] = '[REDACTED]'
        }
    })

    // Truncate large response bodies in non-development environments
    if (config.env !== 'development' && sanitized.body && typeof sanitized.body === 'string' && sanitized.body.length > 1000) {
        sanitized.body = sanitized.body.substring(0, 1000) + '... [truncated]'
    }

    return sanitized
}

const logger = {
    debug: (message, data = {}) => {
        if (shouldLog('debug') && config.env === 'development') {
            console.log(`\x1b[90m[DEBUG] ${message}\x1b[0m`)
        }
    },
    
    info: (message, data = {}) => {
        if (shouldLog('info')) {
            console.log(`\x1b[32m[INFO] ${message}\x1b[0m`)
        }
    },
    
    warn: (message, data = {}) => {
        if (shouldLog('warn')) {
            console.warn(`\x1b[33m[WARN] ${message}\x1b[0m`)
        }
    },
    
    error: (message, error = null) => {
        if (shouldLog('error')) {
            console.error(`\x1b[31m[ERROR] ${message}${error ? ': ' + error.message : ''}\x1b[0m`)
        }
    },

    // Special methods for request/response logging
    request: (message, data = {}) => {
        if (shouldLog('debug') && config.logging.requestBody && config.env === 'development') {
            console.log(`\x1b[36m[REQUEST] ${message}\x1b[0m`)
        }
    },

    response: (message, data = {}) => {
        if (shouldLog('info')) {
            const status = data.success ? '\x1b[32m✓' : '\x1b[31m✗'
            console.log(`${status} ${message}\x1b[0m`)
        }
    }
}

module.exports = logger
