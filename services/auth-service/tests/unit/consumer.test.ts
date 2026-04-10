import { beforeEach, describe, expect, it, vi } from 'vitest'

const handleSubscriptionUpgraded = vi.fn().mockResolvedValue(undefined)

vi.mock('../../src/events/handlers/subscriptionUpgraded.handler.js', () => ({
  handleSubscriptionUpgraded: (...args: unknown[]) => handleSubscriptionUpgraded(...args),
}))

vi.mock('../../src/services/redis.service.js', () => ({
  getRedis: vi.fn(),
  setRedisForTests: vi.fn(),
  bruteForceKey: (ip: string) => `auth:brute:${ip}`,
  adminBruteForceKey: (ip: string) => `auth:admin:brute:${ip}`,
  oauthStateKey: (s: string) => `oauth:state:${s}`,
  refreshTokenKey: (h: string) => `auth:rt:${h}`,
  sessionKey: (id: string) => `auth:session:${id}`,
  emailVerifyKey: (t: string) => `auth:verify:${t}`,
}))

const { getRedis } = await import('../../src/services/redis.service.js')
const consumer = await import('../../src/events/consumer.js')

describe('events/consumer', () => {
  beforeEach(() => {
    handleSubscriptionUpgraded.mockClear()
  })

  it('routeEvent calls handleSubscriptionUpgraded for subscription.upgraded', async () => {
    const payload = { userId: crypto.randomUUID(), newPlan: 'pro', tokenLimit: 1000 }
    await consumer.routeEvent('subscription.upgraded', payload)
    expect(handleSubscriptionUpgraded).toHaveBeenCalledWith(payload)
  })

  it('routeEvent silently ignores unknown event types', async () => {
    await consumer.routeEvent('billing.invoice_paid', { x: 1 })
    expect(handleSubscriptionUpgraded).not.toHaveBeenCalled()
  })

  it('ensureAuthServiceConsumerGroup creates group with MKSTREAM flag', async () => {
    const xgroup = vi.fn().mockResolvedValue('OK')
    vi.mocked(getRedis).mockReturnValue({ xgroup } as never)
    await consumer.ensureAuthServiceConsumerGroup()
    expect(xgroup).toHaveBeenCalledWith(
      'CREATE',
      'platform:events',
      'auth-service-consumers',
      '$',
      'MKSTREAM',
    )
  })

  it('ensureAuthServiceConsumerGroup ignores BUSYGROUP', async () => {
    const xgroup = vi.fn().mockRejectedValue(new Error('BUSYGROUP Consumer Group name already exists'))
    vi.mocked(getRedis).mockReturnValue({ xgroup } as never)
    await expect(consumer.ensureAuthServiceConsumerGroup()).resolves.toBeUndefined()
  })
})
