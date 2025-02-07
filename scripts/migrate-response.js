const fs = require('fs')
const path = require('path')

// Read api.js
const apiPath = path.join(__dirname, '..', 'netlify', 'functions', 'api.js')
let content = fs.readFileSync(apiPath, 'utf8')

// Replace imports
content = content.replace(
  /const \{ createResponse \} = require\('\.\/utils\/response'\)/,
  "const { optimizedResponse } = require('./utils/optimizedResponse')"
)

// Replace all createResponse calls with optimizedResponse
content = content.replace(
  /createResponse\(204\)/g,
  'optimizedResponse(204, null)'
)

content = content.replace(
  /createResponse\((\d+),\s*([^,]+),\s*\{\s*origin\s*\}\)/g,
  'optimizedResponse($1, $2, { origin })'
)

// Special handling for error responses
content = content.replace(
  /createResponse\(500,\s*\{\s*success:\s*false,\s*error:[^}]+\},\s*\{\s*origin\s*\}\)/g,
  `optimizedResponse(500, {
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  }, { origin })`
)

// Write back to api.js
fs.writeFileSync(apiPath, content)

console.log('Migration completed successfully')
