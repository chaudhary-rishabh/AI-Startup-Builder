import { beforeEach, describe, expect, it, vi } from 'vitest'

const xadd = vi.fn().mockResolvedValue('1-0')

vi.mock('../../src/services/redis.service.js', () => ({
  getRedis: vi.fn(() => ({ xadd })),
  setRedisForTests: vi.fn(),
}))

const publisher = await import('../../src/events/publisher.js')

describe('events/publisher', () => {
  beforeEach(() => {
    xadd.mockClear()
  })

  it('publishUserProfileUpdated writes user.profile_updated', async () => {
    await publisher.publishUserProfileUpdated('u1', ['bio'])
    const args = xadd.mock.calls[0] as unknown[]
    expect(args[args.indexOf('type') + 1]).toBe('user.profile_updated')
  })

  it('publishUserDeleted writes user.deleted', async () => {
    await publisher.publishUserDeleted('u1')
    expect(xadd.mock.calls[0]![(xadd.mock.calls[0] as unknown[]).indexOf('type') + 1]).toBe(
      'user.deleted',
    )
  })

  it('publishUserOnboardingCompleted writes user.onboarding_completed', async () => {
    await publisher.publishUserOnboardingCompleted('u1')
    const args = xadd.mock.calls[0] as unknown[]
    expect(args[args.indexOf('type') + 1]).toBe('user.onboarding_completed')
  })
})
