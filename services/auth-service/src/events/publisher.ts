import type {
  AuthBruteForceDetectedEvent,
  UserDeletedEvent,
  UserOnboardingCompletedEvent,
  UserRegisteredEvent,
} from '@repo/types'

import { getRedis } from '../services/redis.service.js'

const STREAM_KEY = 'platform:events'

export async function publishEvent<T extends Record<string, unknown>>(
  type: string,
  payload: T,
): Promise<void> {
  const redis = getRedis()
  await redis.xadd(
    STREAM_KEY,
    'MAXLEN',
    '~',
    '100000',
    '*',
    'type',
    type,
    'payload',
    JSON.stringify(payload),
    'timestamp',
    new Date().toISOString(),
    'source',
    'auth-service',
    'version',
    '1',
  )
}

export async function publishUserRegistered(payload: UserRegisteredEvent): Promise<void> {
  await publishEvent('user.registered', payload as unknown as Record<string, unknown>)
}

export async function publishUserDeleted(payload: UserDeletedEvent): Promise<void> {
  await publishEvent('user.deleted', payload as unknown as Record<string, unknown>)
}

export async function publishUserPasswordReset(userId: string): Promise<void> {
  await publishEvent('user.password_reset', {
    userId,
    resetAt: new Date().toISOString(),
  })
}

export async function publishAuthBruteForceDetected(
  payload: AuthBruteForceDetectedEvent,
): Promise<void> {
  await publishEvent('auth.brute_force_detected', payload as unknown as Record<string, unknown>)
}

export async function publishUserOnboardingCompleted(
  payload: UserOnboardingCompletedEvent,
): Promise<void> {
  await publishEvent('user.onboarding_completed', payload as unknown as Record<string, unknown>)
}
