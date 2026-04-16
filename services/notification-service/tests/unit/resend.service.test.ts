import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  findRecentEmailLog: vi.fn(),
  createEmailLog: vi.fn(),
}))

vi.mock('../../src/db/queries/emailLogs.queries.js', () => ({
  findRecentEmailLog: m.findRecentEmailLog,
  createEmailLog: m.createEmailLog,
}))

import { sendEmail } from '../../src/services/resend.service.js'

describe('resend.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.findRecentEmailLog.mockResolvedValue(undefined)
    m.createEmailLog.mockResolvedValue({ id: '1' })
    ;(globalThis as unknown as { __resendSendMock: ReturnType<typeof vi.fn> }).__resendSendMock.mockResolvedValue({
      data: { id: 're_msg_1' },
    })
  })

  it('sendEmail calls resend with expected payload', async () => {
    await sendEmail({
      to: 'user@example.com',
      userId: 'u1',
      template: 'welcome',
      props: { name: 'User' },
    })
    const resendSend = (globalThis as unknown as { __resendSendMock: ReturnType<typeof vi.fn> }).__resendSendMock
    expect(resendSend).toHaveBeenCalledOnce()
    expect(m.createEmailLog).toHaveBeenCalledOnce()
  })

  it('records failed email log on resend error', async () => {
    ;(globalThis as unknown as { __resendSendMock: ReturnType<typeof vi.fn> }).__resendSendMock.mockRejectedValueOnce(
      new Error('boom'),
    )
    await sendEmail({
      to: 'user@example.com',
      template: 'welcome',
      props: { name: 'User' },
    })
    expect(m.createEmailLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', errorMessage: 'boom' }),
    )
  })

  it('does not throw when resend fails', async () => {
    ;(globalThis as unknown as { __resendSendMock: ReturnType<typeof vi.fn> }).__resendSendMock.mockRejectedValueOnce(
      new Error('boom'),
    )
    await expect(
      sendEmail({
        to: 'user@example.com',
        template: 'welcome',
        props: { name: 'User' },
      }),
    ).resolves.toBeUndefined()
  })

  it('skips dedup for security_alert', async () => {
    m.findRecentEmailLog.mockResolvedValue({ id: 'existing' })
    await sendEmail({
      to: 'user@example.com',
      template: 'security_alert',
      props: { name: 'User', eventType: 'brute_force', timestamp: new Date().toISOString(), actionUrl: 'x' },
    })
    expect((globalThis as unknown as { __resendSendMock: ReturnType<typeof vi.fn> }).__resendSendMock).toHaveBeenCalled()
  })

  it('skips send for recent dedup hit', async () => {
    m.findRecentEmailLog.mockResolvedValue({ id: 'existing' })
    await sendEmail({
      to: 'user@example.com',
      template: 'welcome',
      props: { name: 'User' },
    })
    expect((globalThis as unknown as { __resendSendMock: ReturnType<typeof vi.fn> }).__resendSendMock).not.toHaveBeenCalled()
    expect(m.createEmailLog).not.toHaveBeenCalled()
  })

  it('throws UNKNOWN_TEMPLATE for unknown template', async () => {
    await expect(
      sendEmail({
        to: 'user@example.com',
        template: 'nope',
        props: {},
      }),
    ).rejects.toMatchObject({ code: 'UNKNOWN_TEMPLATE' })
  })
})
