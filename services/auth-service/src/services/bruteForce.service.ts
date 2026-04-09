import type { AuthBruteForceDetectedEvent } from '@repo/types'

import { env } from '../config/env.js'
import { bruteForceKey, getRedis } from './redis.service.js'

interface BruteState {
  attempts: number
  lockedUntil: number
}

function parseState(raw: string | null): BruteState {
  if (!raw) return { attempts: 0, lockedUntil: 0 }
  try {
    const v = JSON.parse(raw) as unknown
    if (
      typeof v === 'object' &&
      v !== null &&
      'attempts' in v &&
      'lockedUntil' in v &&
      typeof (v as BruteState).attempts === 'number' &&
      typeof (v as BruteState).lockedUntil === 'number'
    ) {
      return v as BruteState
    }
  } catch {
    /* invalid payload */
  }
  return { attempts: 0, lockedUntil: 0 }
}

export async function checkBruteForce(
  ip: string,
): Promise<{ blocked: boolean; retryAfter?: number }> {
  if (!ip) return { blocked: false }
  const redis = getRedis()
  const raw = await redis.get(bruteForceKey(ip))
  const state = parseState(raw)
  const now = Date.now()
  if (state.lockedUntil > now) {
    return { blocked: true, retryAfter: Math.max(1, Math.ceil((state.lockedUntil - now) / 1000)) }
  }
  return { blocked: false }
}

export async function recordFailedAttempt(ip: string): Promise<void> {
  if (!ip) return
  const redis = getRedis()
  const key = bruteForceKey(ip)
  const ttlSec = env.BRUTE_FORCE_LOCK_MINUTES * 60
  const raw = await redis.get(key)
  let state = parseState(raw)
  const now = Date.now()

  if (state.lockedUntil > now) {
    return
  }

  state.attempts += 1

  if (state.attempts >= env.BRUTE_FORCE_MAX_ATTEMPTS) {
    state.lockedUntil = now + ttlSec * 1000
    const event: AuthBruteForceDetectedEvent = {
      userId: null,
      ip,
      attempts: state.attempts,
      lockedUntil: new Date(state.lockedUntil).toISOString(),
    }
    try {
      await redis.xadd(
        'auth:events',
        '*',
        'type',
        'auth.brute_force_detected',
        'payload',
        JSON.stringify(event),
      )
    } catch (e) {
      console.error('[auth-service] Failed to publish brute-force event:', e)
    }
  }

  try {
    await redis.set(key, JSON.stringify(state), 'EX', ttlSec)
  } catch (e) {
    console.error('[auth-service] Failed to persist brute-force state:', e)
  }
}

export async function clearAttempts(ip: string): Promise<void> {
  if (!ip) return
  try {
    await getRedis().del(bruteForceKey(ip))
  } catch (e) {
    console.error('[auth-service] Failed to clear brute-force state:', e)
  }
}
