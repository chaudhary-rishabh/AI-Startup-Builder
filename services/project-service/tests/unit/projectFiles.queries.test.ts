import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(),
}))

import * as dbMod from '../../src/lib/db.js'
import {
  buildFileTree,
  type FileTreeNode,
} from '../../src/db/queries/projectFiles.queries.js'
import * as fileQueries from '../../src/db/queries/projectFiles.queries.js'
import type { ProjectFile } from '../../src/db/schema.js'

function pf(over: Partial<ProjectFile> & Pick<ProjectFile, 'id' | 'projectId' | 'path' | 'content'>): ProjectFile {
  return {
    language: null,
    agentType: null,
    isModified: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    ...over,
  }
}

describe('projectFiles.queries', () => {
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

  it('findFilesByProject returns files in ASC path order', async () => {
    const rows = [
      pf({ id: 'a', projectId: 'p1', path: 'a.ts', content: '' }),
      pf({ id: 'b', projectId: 'p1', path: 'b.ts', content: '' }),
    ]
    const orderBySpy = vi.fn().mockResolvedValue(rows)
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({ orderBy: orderBySpy }),
      }),
    } as never)

    await expect(fileQueries.findFilesByProject('p1')).resolves.toBe(rows)
    expect(orderBySpy).toHaveBeenCalled()
  })

  it('findFilesByProject filters by agentType correctly', async () => {
    const rows = [pf({ id: 'a', projectId: 'p1', path: 'x.ts', content: '', agentType: 'backend' })]
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(rows),
        }),
      }),
    } as never)

    await expect(fileQueries.findFilesByProject('p1', 'backend')).resolves.toBe(rows)
  })

  it('upsertFile creates new file', async () => {
    const row = pf({ id: 'f1', projectId: 'p1', path: '/a.ts', content: 'x' })
    mockDb.insert.mockReturnValue({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(
      fileQueries.upsertFile({
        projectId: 'p1',
        path: '/a.ts',
        content: 'x',
        language: null,
        agentType: null,
        isModified: false,
      }),
    ).resolves.toBe(row)
  })

  it('upsertFile updates content on conflict (same path)', async () => {
    const row = pf({ id: 'f1', projectId: 'p1', path: '/a.ts', content: 'new' })
    const onConflictSpy = vi.fn().mockReturnValue({
      returning: () => Promise.resolve([row]),
    })
    mockDb.insert.mockReturnValue({
      values: () => ({
        onConflictDoUpdate: onConflictSpy,
      }),
    } as never)

    await fileQueries.upsertFile({
      projectId: 'p1',
      path: '/a.ts',
      content: 'new',
      language: 'ts',
      agentType: 'backend',
      isModified: false,
    })
    expect(onConflictSpy).toHaveBeenCalled()
    const arg = onConflictSpy.mock.calls[0][0] as { set: Record<string, unknown> }
    expect(arg.set).toMatchObject({
      content: 'new',
      isModified: false,
    })
  })

  it('updateFile sets is_modified=true', async () => {
    const row = pf({ id: 'f1', projectId: 'p1', path: '/a.ts', content: 'edited', isModified: true })
    const setSpy = vi.fn().mockReturnValue({
      where: () => ({
        returning: () => Promise.resolve([row]),
      }),
    })
    mockDb.update.mockReturnValue({ set: setSpy } as never)

    await expect(fileQueries.updateFile('f1', 'p1', { content: 'edited' })).resolves.toBe(row)
    expect(setSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'edited',
        isModified: true,
      }),
    )
  })

  it('deleteProjectFilesByProjectId deletes', async () => {
    mockDb.delete.mockReturnValue({
      where: () => Promise.resolve(undefined),
    } as never)

    await expect(fileQueries.deleteAllFilesByProject('p1')).resolves.toBeUndefined()
  })

  it('findProjectFileByPath returns undefined when missing', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    } as never)

    await expect(fileQueries.findFileByPath('p1', '/nope')).resolves.toBeUndefined()
  })

  it('findProjectFileByPath returns row', async () => {
    const row = pf({ id: 'f1', projectId: 'p1', path: '/x', content: '' })
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(fileQueries.findFileByPath('p1', '/x')).resolves.toBe(row)
  })

  it('buildFileTree groups src/index.ts and src/routes/auth.ts under src', () => {
    const tree = buildFileTree([
      pf({ id: '1', projectId: 'p', path: 'src/index.ts', content: '' }),
      pf({ id: '2', projectId: 'p', path: 'src/routes/auth.ts', content: '' }),
    ])
    expect(tree).toHaveLength(1)
    expect(tree[0]).toMatchObject({ name: 'src', type: 'dir' })
    const src = tree[0] as FileTreeNode
    expect(src.children).toBeDefined()
    const names = src.children!.map((c) => c.name).sort()
    expect(names).toContain('index.ts')
    expect(names).toContain('routes')
    const routes = src.children!.find((c) => c.name === 'routes' && c.type === 'dir')
    expect(routes?.children?.some((c) => c.name === 'auth.ts' && c.type === 'file')).toBe(true)
  })

  it('buildFileTree handles deeply nested paths correctly', () => {
    const tree = buildFileTree([
      pf({ id: 'd', projectId: 'p', path: 'a/b/c/d.ts', content: '' }),
    ])
    expect(tree[0]?.name).toBe('a')
    expect(tree[0]?.type).toBe('dir')
    let level: FileTreeNode[] | undefined = tree[0]?.children
    expect(level?.[0]?.name).toBe('b')
    level = level?.[0]?.children
    expect(level?.[0]?.name).toBe('c')
    level = level?.[0]?.children
    expect(level?.[0]).toMatchObject({ name: 'd.ts', type: 'file', path: 'a/b/c/d.ts' })
  })

  it('buildFileTree sorts directories before files', () => {
    const tree = buildFileTree([
      pf({ id: 'f', projectId: 'p', path: 'z.txt', content: '' }),
      pf({ id: 'd', projectId: 'p', path: 'a/nested/x.ts', content: '' }),
    ])
    expect(tree.map((n) => n.name)).toEqual(['a', 'z.txt'])
    expect(tree[0]?.type).toBe('dir')
    expect(tree[1]?.type).toBe('file')
  })

  it('findFileById returns row', async () => {
    const row = pf({ id: 'f1', projectId: 'p1', path: '/a.ts', content: '' })
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(fileQueries.findFileById('f1', 'p1')).resolves.toBe(row)
  })

  it('deleteFile returns true when row removed', async () => {
    mockDb.delete.mockReturnValue({
      where: () => ({
        returning: () => Promise.resolve([{ id: 'f1' }]),
      }),
    } as never)

    await expect(fileQueries.deleteFile('f1', 'p1')).resolves.toBe(true)
  })

  it('deleteFile returns false when no row', async () => {
    mockDb.delete.mockReturnValue({
      where: () => ({
        returning: () => Promise.resolve([]),
      }),
    } as never)

    await expect(fileQueries.deleteFile('f1', 'p1')).resolves.toBe(false)
  })

  it('listProjectFilesByProjectId delegates to findFilesByProject', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve([]),
        }),
      }),
    } as never)
    await expect(fileQueries.listProjectFilesByProjectId('p1')).resolves.toEqual([])
  })

  it('upsertProjectFile aliases upsertFile', async () => {
    const row = pf({ id: 'f1', projectId: 'p1', path: '/x', content: 'y' })
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
        path: '/x',
        content: 'y',
      } as never),
    ).resolves.toBe(row)
  })
})
