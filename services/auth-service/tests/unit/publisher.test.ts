import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthBruteForceDetectedEvent, UserRegisteredEvent } from '@repo/types'

const xadd = vi.fn().mockResolvedValue('1-0')

vi.mock('../../src/services/redis.service.js', () => ({
  getRedis: vi.fn(() => ({ xadd })),
  setRedisForTests: vi.fn(),
  bruteForceKey: (ip: string) => `auth:brute:${ip}`,
  adminBruteForceKey: (ip: string) => `auth:admin:brute:${ip}`,
  oauthStateKey: (s: string) => `oauth:state:${s}`,
  refreshTokenKey: (h: string) => `auth:rt:${h}`,
  sessionKey: (id: string) => `auth:session:${id}`,
  emailVerifyKey: (t: string) => `auth:verify:${t}`,
}))

const { getRedis } = await import('../../src/services/redis.service.js')
const publisher = await import('../../src/events/publisher.js')

describe('events/publisher', () => {
  beforeEach(() => {
    xadd.mockClear()
    vi.mocked(getRedis).mockReturnValue({ xadd } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('publishUserRegistered calls redis.xadd with platform:events and user.registered type', async () => {
    const payload: UserRegisteredEvent = {
      userId: 'u1',
      email: 'a@b.com',
      name: 'N',
      plan: 'free',
      createdAt: new Date().toISOString(),
    }
    const spy = vi.spyOn(publisher, 'publishEvent')
    await publisher.publishUserRegistered(payload)
    expect(spy).toHaveBeenCalledWith('user.registered', payload)
    expect(xadd).toHaveBeenCalled()
    const args = xadd.mock.calls[0] as unknown[]
    expect(args[0]).toBe('platform:events')
    expect(args[1]).toBe('MAXLEN')
    expect(args[2]).toBe('~')
    expect(args[3]).toBe('100000')
    const typeIdx = args.indexOf('type')
    expect(args[typeIdx + 1]).toBe('user.registered')
    const payloadIdx = args.indexOf('payload')
    expect(JSON.parse(args[payloadIdx + 1] as string)).toEqual(payload)
  })

  it('publishAuthBruteForceDetected includes ip and attempts in JSON payload', async () => {
    const payload: AuthBruteForceDetectedEvent = {
      userId: null,
      ip: '203.0.113.1',
      attempts: 5,
      lockedUntil: new Date().toISOString(),
    }
    await publisher.publishAuthBruteForceDetected(payload)
    const args = xadd.mock.calls[0] as unknown[]
    const payloadIdx = args.indexOf('payload')
    const parsed = JSON.parse(args[payloadIdx + 1] as string) as AuthBruteForceDetectedEvent
    expect(parsed.ip).toBe('203.0.113.1')
    expect(parsed.attempts).toBe(5)
    expect(args[args.indexOf('type') + 1]).toBe('auth.brute_force_detected')
  })

  it('publish helpers delegate to publishEvent with correct type strings', async () => {
    const pe = vi.spyOn(publisher, 'publishEvent').mockResolvedValue()

    await publisher.publishUserDeleted({
      userId: 'u',
      deletedAt: new Date().toISOString(),
      anonymized: true,
    })
    expect(pe).toHaveBeenCalledWith(
      'user.deleted',
      expect.objectContaining({ userId: 'u', anonymized: true }),
    )

    await publisher.publishUserPasswordReset('user-x')
    expect(pe).toHaveBeenCalledWith(
      'user.password_reset',
      expect.objectContaining({ userId: 'user-x', resetAt: expect.any(String) }),
    )

    await publisher.publishUserOnboardingCompleted({
      userId: 'u',
      completedAt: new Date().toISOString(),
    })
    expect(pe).toHaveBeenCalledWith('user.onboarding_completed', expect.any(Object))

    pe.mockRestore()
  })
})
