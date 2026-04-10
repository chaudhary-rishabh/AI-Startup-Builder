import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(),
}))

import * as dbMod from '../../src/lib/db.js'
import * as profilesQueries from '../../src/db/queries/profiles.queries.js'

vi.mock('@repo/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/db')>()
  return {
    ...actual,
    paginate: vi.fn(),
  }
})

import { paginate } from '@repo/db'

describe('profiles.queries', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dbMod.getDb).mockReturnValue(mockDb as never)
  })

  it('findProfileById returns profile when found', async () => {
    const row = { id: 'u1' } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(profilesQueries.findProfileById('u1')).resolves.toBe(row)
  })

  it('findProfileById returns undefined when not found', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    } as never)

    await expect(profilesQueries.findProfileById('missing')).resolves.toBeUndefined()
  })

  it('createProfile inserts and returns new profile', async () => {
    const row = { id: 'u2' } as never
    mockDb.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([row]),
      }),
    } as never)

    await expect(profilesQueries.createProfile({ id: 'u2' } as never)).resolves.toBe(row)
  })

  it('updateProfile returns updated profile', async () => {
    const row = { id: 'u3', companyName: 'Acme' } as never
    mockDb.select.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(profilesQueries.updateProfile('u3', { companyName: 'Acme' })).resolves.toEqual(row)
  })

  it('findAllProfiles returns paginated results with total', async () => {
    const data = [{ id: 'a' }, { id: 'b' }] as never[]
    vi.mocked(paginate).mockResolvedValue({
      data,
      meta: { total: 42, page: 1, limit: 20, totalPages: 3 },
    })

    const result = await profilesQueries.findAllProfiles({
      page: 1,
      limit: 20,
    })

    expect(result.data).toBe(data)
    expect(result.total).toBe(42)
    expect(paginate).toHaveBeenCalled()
  })

  it('findAllProfiles with search uses paginate', async () => {
    vi.mocked(paginate).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    })

    await profilesQueries.findAllProfiles({
      page: 1,
      limit: 10,
      search: 'acme',
    })

    expect(paginate).toHaveBeenCalled()
  })
})
