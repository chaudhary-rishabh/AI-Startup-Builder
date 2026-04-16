import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  findOrCreatePrefs: vi.fn(),
  createInAppNotification: vi.fn(),
}))

vi.mock('../../src/db/queries/notificationPrefs.queries.js', () => ({
  findOrCreatePrefs: m.findOrCreatePrefs,
}))
vi.mock('../../src/services/inApp.service.js', () => ({
  createInAppNotification: m.createInAppNotification,
}))

import { emailQueue } from '../../src/queues/email.queue.js'
import { deliver } from '../../src/services/delivery.service.js'

describe('delivery.service', () => {
  const basePrefs = {
    userId: 'u1',
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

  beforeEach(() => {
    vi.clearAllMocks()
    m.findOrCreatePrefs.mockResolvedValue({ ...basePrefs })
  })

  it('sends both in-app and email when allowed', async () => {
    const addSpy = vi.spyOn(emailQueue, 'add')
    await deliver({
      userId: 'u1',
      userEmail: 'u@test.local',
      inAppData: { type: 'phase_complete', title: 't', body: 'b' },
      emailData: { template: 'phase_complete', props: {} },
    })
    expect(m.createInAppNotification).toHaveBeenCalledOnce()
    expect(addSpy).toHaveBeenCalledOnce()
  })

  it('respects emailEnabled=false', async () => {
    m.findOrCreatePrefs.mockResolvedValueOnce({
      ...basePrefs,
      emailEnabled: false,
    })
    const addSpy = vi.spyOn(emailQueue, 'add')
    await deliver({
      userId: 'u1',
      userEmail: 'u@test.local',
      emailData: { template: 'phase_complete', props: {} },
    })
    expect(addSpy).not.toHaveBeenCalled()
  })

  it('respects inAppEnabled=false', async () => {
    m.findOrCreatePrefs.mockResolvedValueOnce({
      ...basePrefs,
      inAppEnabled: false,
    })
    await deliver({
      userId: 'u1',
      userEmail: 'u@test.local',
      inAppData: { type: 'phase_complete', title: 't', body: 'b' },
    })
    expect(m.createInAppNotification).not.toHaveBeenCalled()
  })

  it('respects phaseComplete=false for phase notifications', async () => {
    m.findOrCreatePrefs.mockResolvedValueOnce({
      ...basePrefs,
      phaseComplete: false,
    })
    const addSpy = vi.spyOn(emailQueue, 'add')
    await deliver({
      userId: 'u1',
      userEmail: 'u@test.local',
      inAppData: { type: 'phase_complete', title: 't', body: 'b' },
      emailData: { template: 'phase_complete', props: {} },
    })
    expect(m.createInAppNotification).not.toHaveBeenCalled()
    expect(addSpy).not.toHaveBeenCalled()
  })

  it('bypasses preferences for security alert template', async () => {
    m.findOrCreatePrefs.mockResolvedValueOnce({
      ...basePrefs,
      emailEnabled: false,
      inAppEnabled: false,
    })
    const addSpy = vi.spyOn(emailQueue, 'add')
    await deliver({
      userId: 'u1',
      userEmail: 'u@test.local',
      inAppData: { type: 'security_alert', title: 't', body: 'b' },
      emailData: { template: 'security_alert', props: {} },
      bypassPreferences: true,
    })
    expect(m.createInAppNotification).toHaveBeenCalledOnce()
    expect(addSpy).toHaveBeenCalledOnce()
  })
})
