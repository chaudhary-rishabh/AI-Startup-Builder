import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(),
}))

import * as dbMod from '../../src/lib/db.js'
import * as phaseQueries from '../../src/db/queries/phaseOutputs.queries.js'

describe('phaseOutputs.queries', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dbMod.getDb).mockReturnValue(mockDb as never)
  })

  it('findCurrentPhaseOutput returns only is_current=true row', async () => {
    const row = { id: 'o1', isCurrent: true } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(phaseQueries.findCurrentPhaseOutput('p1', 2)).resolves.toBe(row)
  })

  it('savePhaseOutput marks old row is_current=false before inserting new', async () => {
    const existing = { id: 'old', version: 2, isCurrent: true } as never
    const newRow = { id: 'new', version: 3, isCurrent: true } as never

    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([existing]),
        }),
      }),
    } as never)

    const updateChain = {
      set: () => ({
        where: () => Promise.resolve(undefined),
      }),
    }
    mockDb.update.mockReturnValue(updateChain as never)

    mockDb.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([newRow]),
      }),
    } as never)

    await expect(
      phaseQueries.savePhaseOutput('p1', 2, { a: 1 }, true),
    ).resolves.toEqual(newRow)

    expect(mockDb.update).toHaveBeenCalled()
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('savePhaseOutput inserts version 1 when no existing current row', async () => {
    const newRow = { id: 'n1', version: 1, isCurrent: true } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    } as never)
    mockDb.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([newRow]),
      }),
    } as never)

    await expect(phaseQueries.savePhaseOutput('p1', 1, {}, false)).resolves.toEqual(newRow)
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it('markPhaseComplete sets is_complete on current row', async () => {
    const row = { id: 'o1', isComplete: true } as never
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(phaseQueries.markPhaseComplete('p1', 2)).resolves.toEqual(row)
  })

  it('getPhaseCompletionStatus returns map with defaults', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () =>
          Promise.resolve([
            { phase: 1, isComplete: true },
            { phase: 2, isComplete: false },
          ]),
      }),
    } as never)

    await expect(phaseQueries.getPhaseCompletionStatus('p1')).resolves.toEqual({
      1: true,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
    })
  })
})
