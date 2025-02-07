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
        if (shouldLog('debug')) {
            console.log(`[DEBUG] ${message}`, sanitizeData(data))
        }
    },
    
    info: (message, data = {}) => {
        if (shouldLog('info')) {
            console.log(`[INFO] ${message}`, sanitizeData(data))
        }
    },
    
    warn: (message, data = {}) => {
        if (shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, sanitizeData(data))
        }
    },
    
    error: (message, error = null) => {
        if (shouldLog('error')) {
            console.error(`[ERROR] ${message}`, error ? {
                message: error.message,
                stack: config.env === 'development' ? error.stack : undefined
            } : null)
        }
    },

    // Special methods for request/response logging
    request: (message, data = {}) => {
        if (shouldLog('debug') && config.logging.requestBody) {
            console.log(`[REQUEST] ${message}`, sanitizeData(data))
        }
    },

    response: (message, data = {}) => {
        if (shouldLog('debug') && config.logging.responseBody) {
            console.log(`[RESPONSE] ${message}`, sanitizeData(data))
        }
    }
}

module.exports = logger
