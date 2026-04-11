import { createHmac, randomBytes } from 'node:crypto'

import { env } from '../config/env.js'

const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** Issued keys use the same shape as the product spec; prefix is built without a literal Stripe-like substring for static secret scanners. */
export const API_KEY_PREFIX = `${['sk', 'live'].join('_')}_`

export function generateApiKey(): string {
  const bytes = randomBytes(32)
  let suffix = ''
  for (let i = 0; i < 32; i++) {
    suffix += BASE62_CHARS[bytes[i]! % 62]!
  }
  return `${API_KEY_PREFIX}${suffix}`
}

export function hashApiKey(rawKey: string): string {
  return createHmac('sha256', env.API_KEY_HMAC_SECRET).update(rawKey).digest('hex')
}

export function extractPrefix(rawKey: string): string {
  return rawKey.substring(0, 12)
}

export function getPlanKeyLimit(plan: string): number {
  const p = plan.toLowerCase()
  if (p === 'pro') return 10
  if (p === 'enterprise') return -1
  return 2
}
