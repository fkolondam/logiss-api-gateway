const { createResponse } = require('./response')
const config = require('./config')
const logger = require('./logger')
const zlib = require('zlib')

function optimizedResponse(statusCode, data, options = {}) {
    const startTime = process.hrtime()
    
    // Add cache headers for GET requests
    const headers = {
        ...options,
        'Cache-Control': config.env === 'development' 
            ? 'no-cache, no-store'
            : `public, max-age=${config.cache.ttl}, stale-while-revalidate=60`,
        'Timing-Allow-Origin': '*',
        'Server-Timing': 'miss, db;dur=53, app;dur=47.2'
    }

    // Compress response in staging/production
    if (config.performance.compression && statusCode === 200) {
        const content = JSON.stringify(data)
        const compressed = zlib.gzipSync(content)
        headers['Content-Encoding'] = 'gzip'
        
        // Calculate response time
        const endTime = process.hrtime(startTime)
        const responseTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)
        
        logger.info(`Response time: ${responseTime}ms, Size: ${content.length} -> ${compressed.length} bytes`)
        
        return {
            ...createResponse(statusCode, data, headers),
            body: compressed.toString('base64'),
            isBase64Encoded: true
        }
    }

    // Calculate response time for non-compressed responses
    const endTime = process.hrtime(startTime)
    const responseTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2)
    logger.info(`Response time: ${responseTime}ms`)

    return createResponse(statusCode, data, headers)
}

module.exports = { optimizedResponse }
