import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(),
}))

import * as dbMod from '../../src/lib/db.js'
import * as convQueries from '../../src/db/queries/conversations.queries.js'

describe('conversations.queries', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dbMod.getDb).mockReturnValue(mockDb as never)
  })

  it('findConversationMessages returns messages in ASC order slice', async () => {
    const t0 = new Date('2020-01-01T00:00:00.000Z')
    const t1 = new Date('2020-01-01T00:00:01.000Z')
    const rows = [
      { id: 'm1', createdAt: t0 },
      { id: 'm2', createdAt: t1 },
    ] as never[]
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => Promise.resolve(rows),
          }),
        }),
      }),
    } as never)

    const result = await convQueries.findConversationMessages('p1', 1, { limit: 10 })
    expect(result.data).toHaveLength(2)
    expect(result.nextCursor).toBeNull()
  })

  it('findConversationMessages cursor pagination sets nextCursor when more rows exist', async () => {
    const dates = [
      new Date('2020-01-01T00:00:00.000Z'),
      new Date('2020-01-01T00:00:01.000Z'),
      new Date('2020-01-01T00:00:02.000Z'),
    ]
    const rows = dates.map((d, i) => ({ id: `m${i}`, createdAt: d })) as never[]
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => Promise.resolve(rows),
          }),
        }),
      }),
    } as never)

    const result = await convQueries.findConversationMessages('p1', 1, { limit: 2 })
    expect(result.data).toHaveLength(2)
    expect(result.nextCursor).toBe(dates[1]!.toISOString())
  })

  it('appendMessage inserts and returns message', async () => {
    const row = { id: 'm1', role: 'user' } as never
    mockDb.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([row]),
      }),
    } as never)

    await expect(
      convQueries.appendMessage({
        projectId: 'p1',
        phase: 1,
        role: 'user',
        content: 'hi',
        metadata: {},
      } as never),
    ).resolves.toBe(row)
  })

  it('deleteConversationsByProject deletes rows', async () => {
    mockDb.delete.mockReturnValue({
      where: () => Promise.resolve(undefined),
    } as never)

    await expect(convQueries.deleteConversationsByProject('p1')).resolves.toBeUndefined()
    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('countMessagesByProjectPhase returns numeric count', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ count: '5' }]),
      }),
    } as never)

    await expect(convQueries.countMessagesByProjectPhase('p1', 2)).resolves.toBe(5)
  })
})
