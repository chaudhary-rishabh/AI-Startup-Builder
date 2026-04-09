import { cors } from 'hono/cors'

import { env } from '../config/env.js'

const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())

/**
 * CORS middleware configured for the AI Startup Builder frontend apps.
 * Credentials mode is required for httpOnly cookie refresh-token flow.
 */
export const corsMiddleware = cors({
  origin: (origin) => {
    // Allow requests with no origin (curl, server-to-server)
    if (!origin) return '*'
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? ''
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-User-ID'],
  exposeHeaders: ['X-Request-ID'],
  credentials: true,
  maxAge: 86_400,
})
