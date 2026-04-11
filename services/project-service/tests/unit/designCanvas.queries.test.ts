import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(),
}))

import * as dbMod from '../../src/lib/db.js'
import * as canvasQueries from '../../src/db/queries/designCanvas.queries.js'

describe('designCanvas.queries', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dbMod.getDb).mockReturnValue(mockDb as never)
  })

  it('findDesignCanvasByProjectId returns row', async () => {
    const row = { id: 'c1', projectId: 'p1' } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(canvasQueries.findDesignCanvasByProjectId('p1')).resolves.toBe(row)
  })

  it('upsertDesignCanvasForProject updates when exists', async () => {
    const existing = { id: 'c1', projectId: 'p1' } as never
    const updated = { id: 'c1', projectId: 'p1', canvasData: [] } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([existing]),
        }),
      }),
    } as never)
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([updated]),
        }),
      }),
    } as never)

    await expect(canvasQueries.upsertDesignCanvasForProject('p1', { canvasData: [] })).resolves.toBe(
      updated,
    )
  })

  it('upsertDesignCanvasForProject inserts when missing', async () => {
    const inserted = { id: 'c2', projectId: 'p1' } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    } as never)
    mockDb.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([inserted]),
      }),
    } as never)

    await expect(canvasQueries.upsertDesignCanvasForProject('p1', {})).resolves.toBe(inserted)
  })
})
