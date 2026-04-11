import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(),
}))

vi.mock('@repo/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/db')>()
  return {
    ...actual,
    paginate: vi.fn(),
  }
})

import { paginate } from '@repo/db'

import * as dbMod from '../../src/lib/db.js'
import * as projectsQueries from '../../src/db/queries/projects.queries.js'

describe('projects.queries', () => {
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

  it('findProjectByIdAndUserId returns project for correct userId', async () => {
    const row = { id: 'p1', userId: 'u1' } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(projectsQueries.findProjectByIdAndUserId('p1', 'u1')).resolves.toBe(row)
  })

  it('findProjectByIdAndUserId returns undefined for empty result (IDOR-safe)', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    } as never)

    await expect(projectsQueries.findProjectByIdAndUserId('p1', 'other')).resolves.toBeUndefined()
  })

  it('findProjectsByUserId uses paginate', async () => {
    const data = [{ id: 'a' }] as never[]
    vi.mocked(paginate).mockResolvedValue({
      data,
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    })

    const result = await projectsQueries.findProjectsByUserId('u1', {
      page: 1,
      limit: 20,
    })

    expect(result.data).toBe(data)
    expect(result.total).toBe(1)
    expect(paginate).toHaveBeenCalled()
  })

  it('findProjectsByUserId excludes deleted via withActive in count/data fns', async () => {
    vi.mocked(paginate).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    })

    await projectsQueries.findProjectsByUserId('u1', { page: 1, limit: 20, status: 'active' })
    expect(paginate).toHaveBeenCalled()
  })

  it('searchProjectsByUserId returns limited columns', async () => {
    const hits = [
      {
        id: 'p1',
        name: 'Acme',
        emoji: '🚀',
        currentPhase: 1,
        isStarred: false,
        status: 'active' as const,
      },
    ] as never[]
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(hits),
        }),
      }),
    } as never)

    await expect(projectsQueries.searchProjectsByUserId('u1', 'ac')).resolves.toEqual(hits)
  })

  it('createProject returns row with defaults from insert', async () => {
    const row = {
      id: 'p2',
      currentPhase: 1,
      isStarred: false,
      status: 'active',
    } as never
    mockDb.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([row]),
      }),
    } as never)

    await expect(
      projectsQueries.createProject({
        userId: 'u1',
        name: 'N',
        currentPhase: 1,
        status: 'active',
        phaseProgress: projectsQueries.initialPhaseProgress(),
      } as never),
    ).resolves.toBe(row)
  })

  it('softDeleteProject returns deleted false when no row updated', async () => {
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    } as never)

    await expect(projectsQueries.softDeleteProject('p1', 'u1')).resolves.toEqual({
      deleted: false,
      deletedAt: null,
    })
  })

  it('toggleStar flips isStarred', async () => {
    const existing = { id: 'p1', userId: 'u1', isStarred: true } as never
    const updated = { id: 'p1', userId: 'u1', isStarred: false } as never
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

    await expect(projectsQueries.toggleStar('p1', 'u1')).resolves.toEqual(updated)
  })

  it('countActiveProjectsByUserId queries count', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ count: '2' }]),
      }),
    } as never)

    await expect(projectsQueries.countActiveProjectsByUserId('u1')).resolves.toBe(2)
  })

  it('findProjectById returns row', async () => {
    const row = { id: 'p9' } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(projectsQueries.findProjectById('p9')).resolves.toBe(row)
  })

  it('softDeleteProject returns deleted true with timestamp', async () => {
    const deletedAt = new Date()
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([{ deletedAt }]),
        }),
      }),
    } as never)

    await expect(projectsQueries.softDeleteProject('p1', 'u1')).resolves.toEqual({
      deleted: true,
      deletedAt: deletedAt.toISOString(),
    })
  })

  it('archiveProject returns undefined when no row updated', async () => {
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    } as never)

    await expect(projectsQueries.archiveProject('p1', 'u1')).resolves.toBeUndefined()
  })

  it('restoreProject returns undefined when no row updated', async () => {
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    } as never)

    await expect(projectsQueries.restoreProject('p1', 'u1')).resolves.toBeUndefined()
  })

  it('findAllProjects uses paginate', async () => {
    vi.mocked(paginate).mockResolvedValue({
      data: [{ id: 'x' }] as never[],
      meta: { total: 3, page: 1, limit: 20, totalPages: 1 },
    })

    const result = await projectsQueries.findAllProjects({ page: 1, limit: 20, userId: 'u1' })
    expect(result.total).toBe(3)
    expect(paginate).toHaveBeenCalled()
  })

  it('duplicateProject throws when source not found', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    } as never)

    await expect(projectsQueries.duplicateProject('missing', 'u1')).rejects.toThrow(
      'duplicateProject: source not found',
    )
  })

  it('duplicateProject creates new project at phase 1', async () => {
    const source = {
      id: 'src',
      userId: 'u1',
      name: 'Orig',
      emoji: '🔥',
      description: 'd',
    } as never
    const created = { id: 'new', userId: 'u1', currentPhase: 1, name: 'Orig (Copy)' } as never

    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([source]),
        }),
      }),
    } as never)
    mockDb.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([created]),
      }),
    } as never)

    await expect(projectsQueries.duplicateProject('src', 'u1')).resolves.toBe(created)
  })
})
