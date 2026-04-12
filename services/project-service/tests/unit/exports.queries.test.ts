import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(),
}))

import * as dbMod from '../../src/lib/db.js'
import * as exportQueries from '../../src/db/queries/exports.queries.js'

describe('exports.queries', () => {
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dbMod.getDb).mockReturnValue(mockDb as never)
  })

  it('createExportJob inserts with queued status', async () => {
    const row = { id: 'e1', jobId: 'j1', status: 'queued' } as never
    mockDb.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([row]),
      }),
    } as never)

    await expect(
      exportQueries.createExportJob({
        jobId: 'j1',
        projectId: 'p1',
        userId: 'u1',
        format: 'zip',
        includePhases: [1, 2, 3],
        status: 'queued',
      } as never),
    ).resolves.toBe(row)
  })

  it('findExportByJobId returns undefined for wrong userId', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    } as never)

    await expect(exportQueries.findExportByJobId('j1', 'wrong-user')).resolves.toBeUndefined()
  })

  it('updateExportStatus updates status and progress', async () => {
    const updated = { jobId: 'j1', status: 'processing', progress: 60 } as never
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([updated]),
        }),
      }),
    } as never)

    await expect(
      exportQueries.updateExportStatus('j1', { status: 'processing', progress: 60 }),
    ).resolves.toEqual(updated)
  })
})
