import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  createNotification: vi.fn(),
  countUnreadByUser: vi.fn(),
}))

vi.mock('../../src/db/queries/notifications.queries.js', () => ({
  createNotification: m.createNotification,
  countUnreadByUser: m.countUnreadByUser,
}))

import { getRedis } from '../../src/lib/redis.js'
import { createInAppNotification, getUnreadCount } from '../../src/services/inApp.service.js'

describe('inApp.service', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await getRedis().flushall()
  })

  it('createNotification inserts and invalidates unread cache', async () => {
    await getRedis().set('notif:unread:u1', '3')
    m.createNotification.mockResolvedValue({ id: 'n1' })
    await createInAppNotification({
      userId: 'u1',
      type: 'system_alert',
      title: 'hi',
      body: 'body',
    })
    expect(m.createNotification).toHaveBeenCalledOnce()
    expect(await getRedis().get('notif:unread:u1')).toBeNull()
  })

  it('getUnreadCount uses cached value on second call', async () => {
    m.countUnreadByUser.mockResolvedValue(7)
    expect(await getUnreadCount('u1')).toBe(7)
    expect(await getUnreadCount('u1')).toBe(7)
    expect(m.countUnreadByUser).toHaveBeenCalledTimes(1)
  })

  it('getUnreadCount queries and caches on first call', async () => {
    m.countUnreadByUser.mockResolvedValue(4)
    const n = await getUnreadCount('u2')
    expect(n).toBe(4)
    expect(await getRedis().get('notif:unread:u2')).toBe('4')
  })
})
