import type { MiddlewareHandler } from 'hono'

import { env } from '../config/env.js'

const isProduction = env.NODE_ENV === 'production'

/**
 * Security headers middleware — equivalent to the popular `helmet` package
 * but implemented natively for Hono so it stays dependency-light.
 */
export const helmetMiddleware: MiddlewareHandler = async (c, next) => {
  await next()

  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'DENY')
  c.res.headers.set('X-XSS-Protection', '1; mode=block')
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
    ].join('; '),
  )
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // HSTS only makes sense in production (HTTPS)
  if (isProduction) {
    c.res.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    )
  }

  // Strip server fingerprinting header
  c.res.headers.delete('X-Powered-By')
}
