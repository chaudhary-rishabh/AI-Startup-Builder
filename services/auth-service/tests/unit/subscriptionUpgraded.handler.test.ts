import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const updateUser = vi.fn()

vi.mock('../../src/db/queries/users.queries.js', () => ({
  updateUser: (...args: unknown[]) => updateUser(...args),
}))

const { handleSubscriptionUpgraded } = await import(
  '../../src/events/handlers/subscriptionUpgraded.handler.js'
)

describe('subscriptionUpgraded.handler', () => {
  beforeEach(() => {
    updateUser.mockReset()
    updateUser.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('valid payload updates user planTier in DB', async () => {
    const userId = crypto.randomUUID()
    const payload = { userId, newPlan: 'pro' as const, tokenLimit: 10_000 }
    await handleSubscriptionUpgraded(payload)
    expect(updateUser).toHaveBeenCalledWith(userId, { planTier: 'pro' })
  })

  it('invalid payload (missing userId) logs warning and does not throw', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(handleSubscriptionUpgraded({ newPlan: 'pro', tokenLimit: 1 })).resolves.toBeUndefined()
    expect(updateUser).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('DB update failure is logged and does not crash handler', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    updateUser.mockRejectedValueOnce(new Error('db down'))
    const userId = crypto.randomUUID()
    await expect(
      handleSubscriptionUpgraded({ userId, newPlan: 'enterprise', tokenLimit: 1 }),
    ).resolves.toBeUndefined()
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })
})
