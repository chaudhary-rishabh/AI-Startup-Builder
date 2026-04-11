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
    delete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dbMod.getDb).mockReturnValue(mockDb as never)
  })

  it('findCanvasByProjectId returns canvas when found', async () => {
    const row = {
      id: 'c1',
      projectId: 'p1',
      canvasData: [],
      pages: [],
      designTokens: {},
      viewport: { x: 0, y: 0, zoom: 1 },
    } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(canvasQueries.findCanvasByProjectId('p1')).resolves.toBe(row)
  })

  it('findCanvasByProjectId returns undefined when not found', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    } as never)

    await expect(canvasQueries.findCanvasByProjectId('p1')).resolves.toBeUndefined()
  })

  it('createCanvas creates with empty defaults', async () => {
    const inserted = {
      id: 'c2',
      projectId: 'p1',
      canvasData: [],
      pages: [],
      designTokens: {},
      viewport: { x: 0, y: 0, zoom: 1 },
    } as never
    const valuesSpy = vi.fn().mockReturnValue({
      returning: () => Promise.resolve([inserted]),
    })
    mockDb.insert.mockReturnValue({ values: valuesSpy } as never)

    await expect(canvasQueries.createCanvas('p1')).resolves.toBe(inserted)
    expect(valuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'p1',
        canvasData: [],
        pages: [],
        designTokens: {},
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
    )
  })

  it('upsertCanvas creates when not exists', async () => {
    const inserted = { id: 'c2', projectId: 'p1', canvasData: [{ a: 1 }] } as never
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

    await expect(
      canvasQueries.upsertCanvas('p1', { canvasData: [{ a: 1 }] }),
    ).resolves.toBe(inserted)
  })

  it('upsertCanvas updates only provided fields (keeps existing for omitted)', async () => {
    const existing = {
      id: 'c1',
      projectId: 'p1',
      canvasData: [{ old: true }],
      pages: [{ p: 1 }],
      designTokens: { color: 'blue' },
      viewport: { x: 1, y: 2, zoom: 2 },
    } as never
    const updated = {
      ...existing,
      canvasData: [{ new: true }],
      pages: [{ p: 1 }],
      designTokens: { color: 'blue' },
      viewport: { x: 1, y: 2, zoom: 2 },
    } as never

    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([existing]),
        }),
      }),
    } as never)

    const setSpy = vi.fn().mockReturnValue({
      where: () => ({
        returning: () => Promise.resolve([updated]),
      }),
    })
    mockDb.update.mockReturnValue({ set: setSpy } as never)

    await canvasQueries.upsertCanvas('p1', { canvasData: [{ new: true }] })

    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        canvasData: [{ new: true }],
        pages: [{ p: 1 }],
        designTokens: { color: 'blue' },
        viewport: { x: 1, y: 2, zoom: 2 },
      }),
    )
  })

  it('deleteCanvas removes row', async () => {
    const whereSpy = vi.fn().mockResolvedValue(undefined)
    mockDb.delete.mockReturnValue({ where: whereSpy } as never)

    await expect(canvasQueries.deleteCanvas('p1')).resolves.toBeUndefined()
    expect(mockDb.delete).toHaveBeenCalled()
    expect(whereSpy).toHaveBeenCalled()
  })

  it('findDesignCanvasByProjectId aliases findCanvasByProjectId', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    } as never)

    await expect(canvasQueries.findDesignCanvasByProjectId('p1')).resolves.toBeUndefined()
  })
})
