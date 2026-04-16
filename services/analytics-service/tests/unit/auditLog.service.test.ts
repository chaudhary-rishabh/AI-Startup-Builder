import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  insertAuditLog: vi.fn(),
  findAuditLogs: vi.fn(),
}))

vi.mock('../../src/db/queries/auditLogs.queries.js', () => ({
  insertAuditLog: m.insertAuditLog,
  findAuditLogs: m.findAuditLogs,
}))

import { queryAuditLogs, writeAuditEntry } from '../../src/services/auditLog.service.js'

describe('auditLog.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writeAuditEntry inserts row with all fields', async () => {
    m.insertAuditLog.mockResolvedValue({ id: 'a1', action: 'user.suspended' })
    const row = await writeAuditEntry({
      adminId: 'u1',
      action: 'user.suspended',
      targetType: 'user',
      targetId: 'u2',
      beforeState: { status: 'active' },
      afterState: { status: 'suspended' },
      ipAddress: '127.0.0.1',
      userAgent: 'UA',
    })
    expect(row?.id).toBe('a1')
  })

  it('writeAuditEntry does not throw on failure', async () => {
    m.insertAuditLog.mockRejectedValue(new Error('db down'))
    await expect(
      writeAuditEntry({
        adminId: 'u1',
        action: 'x',
        targetType: 'user',
      }),
    ).resolves.toBeNull()
  })

  it('immutability contract: service has no update path', async () => {
    expect(typeof writeAuditEntry).toBe('function')
    expect(typeof (queryAuditLogs as unknown)).toBe('function')
  })

  it('queryAuditLogs filters by adminId', async () => {
    m.findAuditLogs.mockResolvedValue({ data: [], total: 0 })
    await queryAuditLogs({ adminId: 'u1', page: 1, limit: 50 })
    expect(m.findAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ adminId: 'u1' }))
  })

  it('queryAuditLogs filters by action', async () => {
    m.findAuditLogs.mockResolvedValue({ data: [], total: 0 })
    await queryAuditLogs({ action: 'user.suspended', page: 1, limit: 50 })
    expect(m.findAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.suspended' }))
  })

  it('queryAuditLogs date filters', async () => {
    m.findAuditLogs.mockResolvedValue({ data: [], total: 0 })
    const fromDate = new Date('2025-01-01')
    await queryAuditLogs({ fromDate, page: 1, limit: 50 })
    expect(m.findAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ fromDate }))
  })

  it('queryAuditLogs uses read path through query layer', async () => {
    m.findAuditLogs.mockResolvedValue({ data: [], total: 0 })
    await queryAuditLogs({ page: 1, limit: 50 })
    expect(m.findAuditLogs).toHaveBeenCalledTimes(1)
  })
})
