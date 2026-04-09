import { createLogger, format, transports, type Logger } from 'winston'

import { env } from '../config/env.js'

// ── PII scrubber ────────────────────────────────────────────────────────────────
const REDACTED = '[REDACTED]'

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'email',
  'secret',
  'apikey',
  'api_key',
  'accesstoken',
  'refreshtoken',
  'privatekey',
  'private_key',
])

function scrubObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(scrubObject)

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[-_]/g, '')
    if (SENSITIVE_KEYS.has(normalized)) {
      result[key] = REDACTED
    } else {
      result[key] = scrubObject(value)
    }
  }
  return result
}

const piiScrubber = format((info) => {
  return scrubObject(info) as typeof info
})

// ── Logger factory ───────────────────────────────────────────────────────────────
const logger: Logger = createLogger({
  level: env.LOG_LEVEL,

  format: format.combine(
    piiScrubber(),
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    format.errors({ stack: true }),
    format.json(),
  ),

  defaultMeta: { service: 'api-gateway' },

  transports: [
    new transports.Console({
      // Only warn+ in production to reduce noise; all levels in dev/test
      level: env.NODE_ENV === 'production' ? 'warn' : env.LOG_LEVEL,
      silent: env.NODE_ENV === 'test',
    }),
  ],
})

export { logger }
