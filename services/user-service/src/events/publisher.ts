import type {
  UserApiKeyCreatedEvent,
  UserDeletedEvent,
  UserOnboardingCompletedEvent,
  UserProfileUpdatedEvent,
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
    'user-service',
    'version',
    '1',
  )
}

export async function publishUserProfileUpdated(
  userId: string,
  changes: string[],
): Promise<void> {
  const base: UserProfileUpdatedEvent = { userId, changes }
  await publishEvent('user.profile_updated', {
    ...base,
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>)
}

export async function publishUserApiKeyCreated(
  userId: string,
  keyId: string,
  scopes: string[],
): Promise<void> {
  const payload: UserApiKeyCreatedEvent = { userId, keyId, scopes }
  await publishEvent('user.api_key_created', payload as unknown as Record<string, unknown>)
}

export async function publishUserDeleted(userId: string): Promise<void> {
  const payload: UserDeletedEvent = {
    userId,
    deletedAt: new Date().toISOString(),
    anonymized: true,
  }
  await publishEvent('user.deleted', payload as unknown as Record<string, unknown>)
}

export async function publishUserOnboardingCompleted(userId: string): Promise<void> {
  const payload: UserOnboardingCompletedEvent = {
    userId,
    completedAt: new Date().toISOString(),
  }
  await publishEvent('user.onboarding_completed', payload as unknown as Record<string, unknown>)
}
