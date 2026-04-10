import { beforeEach, describe, expect, it, vi } from 'vitest'

const handleUserRegistered = vi.fn().mockResolvedValue(undefined)

vi.mock('../../src/events/handlers/userRegistered.handler.js', () => ({
  handleUserRegistered: (...a: unknown[]) => handleUserRegistered(...a),
}))

vi.mock('../../src/lib/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('../../src/services/redis.service.js', () => ({
  getRedis: vi.fn(),
  setRedisForTests: vi.fn(),
}))

import { getRedis } from '../../src/services/redis.service.js'
const consumer = await import('../../src/events/consumer.js')

describe('events/consumer', () => {
  beforeEach(() => {
    handleUserRegistered.mockClear()
  })

  it('routeEvent calls handleUserRegistered for user.registered', async () => {
    await consumer.routeEvent('user.registered', { x: 1 })
    expect(handleUserRegistered).toHaveBeenCalledWith({ x: 1 })
  })

  it('routeEvent ignores unknown types', async () => {
    await consumer.routeEvent('unknown.event', {})
    expect(handleUserRegistered).not.toHaveBeenCalled()
  })

  it('ensureUserServiceConsumerGroup uses MKSTREAM', async () => {
    const xgroup = vi.fn().mockResolvedValue('OK')
    vi.mocked(getRedis).mockReturnValue({ xgroup } as never)
    await consumer.ensureUserServiceConsumerGroup()
    expect(xgroup).toHaveBeenCalledWith(
      'CREATE',
      'platform:events',
      'user-service-consumers',
      '$',
      'MKSTREAM',
    )
  })

  it('subscription.upgraded does not throw', async () => {
    await consumer.routeEvent('subscription.upgraded', {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      newPlan: 'pro',
    })
  })
})
