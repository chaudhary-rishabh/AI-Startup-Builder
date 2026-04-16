import { randomUUID } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  notifications: [] as Array<Record<string, unknown>>,
  prefs: new Map<string, Record<string, unknown>>(),
  emailLogs: [] as Array<Record<string, unknown>>,
}))

const m = vi.hoisted(() => ({
  dbExecute: vi.fn(),
}))

vi.mock('../../src/lib/db.js', () => ({
  getDb: () => ({ execute: m.dbExecute }),
}))

vi.mock('../../src/db/queries/notificationPrefs.queries.js', () => ({
  findOrCreatePrefs: vi.fn(async (userId: string) => {
    const existing = state.prefs.get(userId)
    if (existing) return existing
    const prefs = {
      userId,
      emailEnabled: true,
      inAppEnabled: true,
      phaseComplete: true,
      agentDone: true,
      billingEvents: true,
      tokenWarnings: true,
      ragStatus: true,
      exportReady: true,
      weeklyDigest: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    state.prefs.set(userId, prefs)
    return prefs
  }),
  updatePrefs: vi.fn(async (userId: string, data: Record<string, unknown>) => {
    const current = state.prefs.get(userId) ?? {
      userId,
      emailEnabled: true,
      inAppEnabled: true,
      phaseComplete: true,
      agentDone: true,
      billingEvents: true,
      tokenWarnings: true,
      ragStatus: true,
      exportReady: true,
      weeklyDigest: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const next = { ...current, ...data, updatedAt: new Date() }
    state.prefs.set(userId, next)
    return next
  }),
}))

vi.mock('../../src/db/queries/notifications.queries.js', () => ({
  createNotification: vi.fn(async (data: Record<string, unknown>) => {
    const row = { id: randomUUID(), isRead: false, createdAt: new Date(), ...data }
    state.notifications.push(row)
    return row
  }),
  countUnreadByUser: vi.fn(async (userId: string) =>
    state.notifications.filter((n) => n['userId'] === userId && !n['isRead']).length,
  ),
  findNotificationsByUser: vi.fn(async (userId: string) => ({
    data: state.notifications.filter((n) => n['userId'] === userId),
    nextCursor: null,
  })),
  markAsRead: vi.fn(async (id: string, userId: string) => {
    const row = state.notifications.find((n) => n['id'] === id && n['userId'] === userId)
    if (!row) return undefined
    row['isRead'] = true
    row['readAt'] = new Date()
    return row
  }),
  markAllAsRead: vi.fn(async (userId: string) => {
    let marked = 0
    for (const row of state.notifications) {
      if (row['userId'] === userId && !row['isRead']) {
        row['isRead'] = true
        marked += 1
      }
    }
    return marked
  }),
  deleteNotification: vi.fn(async (id: string, userId: string) => {
    const idx = state.notifications.findIndex((n) => n['id'] === id && n['userId'] === userId)
    if (idx < 0) return false
    state.notifications.splice(idx, 1)
    return true
  }),
}))

vi.mock('../../src/db/queries/emailLogs.queries.js', () => ({
  findRecentEmailLog: vi.fn(async (toEmail: string, template: string) =>
    state.emailLogs.find((e) => e['toEmail'] === toEmail && e['template'] === template),
  ),
  createEmailLog: vi.fn(async (data: Record<string, unknown>) => {
    const row = { id: randomUUID(), createdAt: new Date(), ...data }
    state.emailLogs.push(row)
    return row
  }),
  updateEmailLogStatus: vi.fn(),
}))

import { createApp } from '../../src/app.js'
import { processNotificationEvent } from '../../src/events/consumer.js'
import { getRedis } from '../../src/lib/redis.js'
import { emailQueue } from '../../src/queues/email.queue.js'
import { notificationQueue } from '../../src/queues/notification.queue.js'
import { sendEmail } from '../../src/services/resend.service.js'
import { createInAppNotification, getUnreadCount } from '../../src/services/inApp.service.js'
import { signTestAccessToken } from '../jwt.js'

describe('full notification flow', () => {
  const userId = randomUUID()
  const user2 = randomUUID()
  let adminToken: string

  beforeEach(async () => {
    state.notifications.length = 0
    state.emailLogs.length = 0
    state.prefs.clear()
    await getRedis().flushall()
    await emailQueue.obliterate()
    await notificationQueue.obliterate()
    m.dbExecute.mockImplementation(async (_q: unknown) => ({
      rows: [{ email: 'user@test.local', full_name: 'User Name' }],
    }))
    adminToken = await signTestAccessToken({ userId: randomUUID(), role: 'admin' })
  })

  it('1) user.registered creates prefs + in-app + welcome queue job', async () => {
    await processNotificationEvent('user.registered', {
      userId,
      email: 'user@test.local',
      name: 'User',
    })
    expect(state.prefs.has(userId)).toBe(true)
    expect(state.notifications.some((n) => n['type'] === 'system_alert')).toBe(true)
    const jobs = await emailQueue.getJobs()
    expect(jobs.some((j) => j.data['template'] === 'welcome')).toBe(true)
  })

  it('2) project.phase.advanced creates phase_complete + email queue', async () => {
    await processNotificationEvent('project.phase.advanced', {
      projectId: 'p1',
      userId,
      userEmail: 'user@test.local',
      userName: 'User',
      projectName: 'Nova',
      projectEmoji: '🚀',
      fromPhase: 1,
      toPhase: 2,
    })
    expect(state.notifications.some((n) => n['type'] === 'phase_complete')).toBe(true)
    const jobs = await emailQueue.getJobs()
    const job = jobs.find((j) => j.data['template'] === 'phase_complete')
    expect(job).toBeTruthy()
    const props = job?.data['props'] as { nextPhaseUrl?: string } | undefined
    expect(props?.nextPhaseUrl).toContain('/plan')
  })

  it('3) invoice.paid creates billing event and billing receipt email', async () => {
    await processNotificationEvent('invoice.paid', {
      userId,
      userEmail: 'user@test.local',
      userName: 'User',
      amountCents: 2900,
      currency: 'usd',
      invoiceId: 'in_1',
      receiptUrl: 'https://invoice',
      planName: 'Pro',
    })
    expect(state.notifications.some((n) => n['type'] === 'billing_event')).toBe(true)
    const jobs = await emailQueue.getJobs()
    expect(jobs.some((j) => j.data['template'] === 'billing_receipt')).toBe(true)
  })

  it('4) token warning 80% uses token_warning_80 template', async () => {
    await processNotificationEvent('token.budget.warning', {
      userId,
      userEmail: 'user@test.local',
      userName: 'User',
      percentUsed: 80,
      tokensUsed: 40_000,
      tokenLimit: 50_000,
      planName: 'Free',
    })
    const jobs = await emailQueue.getJobs()
    expect(jobs.some((j) => j.data['template'] === 'token_warning_80')).toBe(true)
  })

  it('5) token warning 95% uses token_warning_95 template', async () => {
    await processNotificationEvent('token.budget.warning', {
      userId,
      userEmail: 'user@test.local',
      userName: 'User',
      percentUsed: 95,
      tokensUsed: 47_500,
      tokenLimit: 50_000,
      planName: 'Free',
    })
    const jobs = await emailQueue.getJobs()
    expect(jobs.some((j) => j.data['template'] === 'token_warning_95')).toBe(true)
  })

  it('6) brute force bypasses disabled preferences', async () => {
    state.prefs.set(userId, {
      userId,
      emailEnabled: false,
      inAppEnabled: false,
      phaseComplete: false,
      agentDone: false,
      billingEvents: false,
      tokenWarnings: false,
      ragStatus: false,
      exportReady: false,
      weeklyDigest: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await processNotificationEvent('auth.brute_force.detected', {
      userId,
      userEmail: 'user@test.local',
      userName: 'User',
      ipAddress: '127.0.0.1',
      attempts: 12,
    })
    expect(state.notifications.some((n) => n['type'] === 'security_alert')).toBe(true)
    const jobs = await emailQueue.getJobs()
    expect(jobs.some((j) => j.data['template'] === 'security_alert')).toBe(true)
  })

  it('7) document.indexing.failed sends rag_status + rag_failed email', async () => {
    await processNotificationEvent('document.indexing.failed', {
      userId,
      userEmail: 'user@test.local',
      userName: 'User',
      docId: 'd1',
      filename: 'plan.pdf',
      error: 'parse failed',
    })
    expect(state.notifications.some((n) => n['type'] === 'rag_status')).toBe(true)
    const jobs = await emailQueue.getJobs()
    expect(jobs.some((j) => j.data['template'] === 'rag_failed')).toBe(true)
  })

  it('8) phaseComplete preference false blocks phase notifications', async () => {
    state.prefs.set(userId, {
      userId,
      emailEnabled: true,
      inAppEnabled: true,
      phaseComplete: false,
      agentDone: true,
      billingEvents: true,
      tokenWarnings: true,
      ragStatus: true,
      exportReady: true,
      weeklyDigest: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await processNotificationEvent('project.phase.advanced', {
      projectId: 'p1',
      userId,
      userEmail: 'user@test.local',
      userName: 'User',
      projectName: 'Nova',
      projectEmoji: '🚀',
      fromPhase: 1,
      toPhase: 2,
    })
    expect(state.notifications.some((n) => n['type'] === 'phase_complete')).toBe(false)
    const jobs = await emailQueue.getJobs()
    expect(jobs.length).toBe(0)
  })

  it('9) emailEnabled false blocks email while keeping in-app', async () => {
    state.prefs.set(userId, {
      userId,
      emailEnabled: false,
      inAppEnabled: true,
      phaseComplete: true,
      agentDone: true,
      billingEvents: true,
      tokenWarnings: true,
      ragStatus: true,
      exportReady: true,
      weeklyDigest: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await processNotificationEvent('project.phase.advanced', {
      projectId: 'p1',
      userId,
      userEmail: 'user@test.local',
      userName: 'User',
      projectName: 'Nova',
      projectEmoji: '🚀',
      fromPhase: 1,
      toPhase: 2,
    })
    expect(state.notifications.some((n) => n['type'] === 'phase_complete')).toBe(true)
    const jobs = await emailQueue.getJobs()
    expect(jobs.length).toBe(0)
  })

  it('10) resend dedup blocks duplicate welcome emails', async () => {
    state.emailLogs.push({
      id: randomUUID(),
      toEmail: 'user@test.local',
      template: 'welcome',
      createdAt: new Date(),
    })
    await sendEmail({
      to: 'user@test.local',
      template: 'welcome',
      props: { name: 'User' },
    })
    expect(
      (globalThis as unknown as { __resendSendMock: ReturnType<typeof vi.fn> }).__resendSendMock,
    ).not.toHaveBeenCalled()
  })

  it('11) admin broadcast enqueues both queue jobs', async () => {
    const res = await createApp().request('http://localhost/notifications/admin/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds: [userId, user2],
        title: 'Maintenance',
        body: 'Scheduled update',
        channel: 'both',
      }),
    })
    expect(res.status).toBe(202)
    expect((await notificationQueue.getJobs()).length).toBe(2)
    expect((await emailQueue.getJobs()).length).toBe(2)
  })

  it('12) unread count cache invalidates after new notification', async () => {
    await createInAppNotification({ userId, type: 'system_alert', title: '1', body: '1' })
    await createInAppNotification({ userId, type: 'system_alert', title: '2', body: '2' })
    await createInAppNotification({ userId, type: 'system_alert', title: '3', body: '3' })
    expect(await getUnreadCount(userId)).toBe(3)
    expect(await getRedis().get(`notif:unread:${userId}`)).toBe('3')
    await createInAppNotification({ userId, type: 'system_alert', title: '4', body: '4' })
    expect(await getRedis().get(`notif:unread:${userId}`)).toBeNull()
    expect(await getUnreadCount(userId)).toBe(4)
  })
})
