import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(),
}))

import * as dbMod from '../../src/lib/db.js'
import * as fileQueries from '../../src/db/queries/projectFiles.queries.js'

describe('projectFiles.queries', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dbMod.getDb).mockReturnValue(mockDb as never)
  })

  it('listProjectFilesByProjectId returns rows', async () => {
    const rows = [{ id: 'f1' }] as never[]
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve(rows),
      }),
    } as never)

    await expect(fileQueries.listProjectFilesByProjectId('p1')).resolves.toBe(rows)
  })

  it('upsertProjectFile uses onConflictDoUpdate', async () => {
    const row = { id: 'f1', path: '/a.ts' } as never
    mockDb.insert.mockReturnValue({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(
      fileQueries.upsertProjectFile({
        projectId: 'p1',
        path: '/a.ts',
        content: 'x',
      } as never),
    ).resolves.toBe(row)
  })

  it('deleteProjectFilesByProjectId deletes', async () => {
    mockDb.delete.mockReturnValue({
      where: () => Promise.resolve(undefined),
    } as never)

    await expect(fileQueries.deleteProjectFilesByProjectId('p1')).resolves.toBeUndefined()
  })

  it('findProjectFileByPath returns undefined when missing', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    } as never)

    await expect(fileQueries.findProjectFileByPath('p1', '/nope')).resolves.toBeUndefined()
  })

  it('findProjectFileByPath returns row', async () => {
    const row = { id: 'f1' } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(fileQueries.findProjectFileByPath('p1', '/x')).resolves.toBe(row)
  })
})
