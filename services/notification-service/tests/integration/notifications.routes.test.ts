import { randomUUID } from 'node:crypto'

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { signTestAccessToken } from '../jwt.js'

const m = vi.hoisted(() => ({
  findNotificationsByUser: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  getUnreadCount: vi.fn(),
}))

vi.mock('../../src/db/queries/notifications.queries.js', () => ({
  findNotificationsByUser: m.findNotificationsByUser,
  markAsRead: m.markAsRead,
  markAllAsRead: m.markAllAsRead,
  deleteNotification: m.deleteNotification,
}))
vi.mock('../../src/services/inApp.service.js', () => ({
  getUnreadCount: m.getUnreadCount,
  createInAppNotification: vi.fn(),
}))

import { createApp } from '../../src/app.js'
import { getRedis } from '../../src/lib/redis.js'

describe('notifications.routes', () => {
  let token: string
  const userId = randomUUID()

  beforeAll(async () => {
    token = await signTestAccessToken({ userId })
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    await getRedis().flushall()
    m.findNotificationsByUser.mockResolvedValue({ data: [], nextCursor: null })
    m.getUnreadCount.mockResolvedValue(0)
    m.markAsRead.mockResolvedValue({ id: randomUUID(), readAt: new Date() })
    m.markAllAsRead.mockResolvedValue(3)
    m.deleteNotification.mockResolvedValue(true)
  })

  it('GET /notifications returns empty array for new user', async () => {
    const res = await createApp().request('http://localhost/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { notifications: unknown[] } }
    expect(body.data.notifications).toEqual([])
  })

  it('GET /notifications returns newest first', async () => {
    m.findNotificationsByUser.mockResolvedValueOnce({
      data: [{ id: '2' }, { id: '1' }],
      nextCursor: null,
    })
    const res = await createApp().request('http://localhost/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { notifications: Array<{ id: string }> } }
    expect(body.data.notifications[0]?.id).toBe('2')
  })

  it('GET /notifications cursor pagination passes cursor', async () => {
    await createApp().request('http://localhost/notifications?cursor=2026-01-01T00:00:00.000Z', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(m.findNotificationsByUser).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ cursor: '2026-01-01T00:00:00.000Z' }),
    )
  })

  it('GET /notifications isRead=false filter', async () => {
    await createApp().request('http://localhost/notifications?isRead=false', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(m.findNotificationsByUser).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ isRead: false }),
    )
  })

  it('GET /notifications type filter', async () => {
    await createApp().request('http://localhost/notifications?type=token_warning', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(m.findNotificationsByUser).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ type: 'token_warning' }),
    )
  })

  it('GET /notifications/unread-count returns 0 for new user', async () => {
    const res = await createApp().request('http://localhost/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { count: number } }
    expect(body.data.count).toBe(0)
  })

  it('GET /notifications/unread-count cache path from service', async () => {
    m.getUnreadCount.mockResolvedValueOnce(5)
    const app = createApp()
    await app.request('http://localhost/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
    })
    await app.request('http://localhost/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(m.getUnreadCount).toHaveBeenCalledTimes(2)
  })

  it('POST /notifications/:id/read marks as read', async () => {
    const id = randomUUID()
    const res = await createApp().request(`http://localhost/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
  })

  it('POST /notifications/:id/read invalidates unread cache', async () => {
    const id = randomUUID()
    await getRedis().set(`notif:unread:${userId}`, '2')
    await createApp().request(`http://localhost/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(await getRedis().get(`notif:unread:${userId}`)).toBeNull()
  })

  it('POST /notifications/:id/read wrong user -> 404', async () => {
    m.markAsRead.mockResolvedValueOnce(undefined)
    const id = randomUUID()
    const res = await createApp().request(`http://localhost/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('POST /notifications/read-all marks all unread', async () => {
    const res = await createApp().request('http://localhost/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
  })

  it('POST /notifications/read-all returns marked count', async () => {
    m.markAllAsRead.mockResolvedValueOnce(2)
    const res = await createApp().request('http://localhost/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = (await res.json()) as { data: { markedCount: number } }
    expect(body.data.markedCount).toBe(2)
  })

  it('DELETE /notifications/:id deletes notification', async () => {
    const res = await createApp().request(`http://localhost/notifications/${randomUUID()}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
  })

  it('DELETE /notifications/:id wrong user -> 404', async () => {
    m.deleteNotification.mockResolvedValueOnce(false)
    const res = await createApp().request(`http://localhost/notifications/${randomUUID()}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('DELETE /notifications/:id invalidates unread cache', async () => {
    await getRedis().set(`notif:unread:${userId}`, '3')
    await createApp().request(`http://localhost/notifications/${randomUUID()}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(await getRedis().get(`notif:unread:${userId}`)).toBeNull()
  })
})
