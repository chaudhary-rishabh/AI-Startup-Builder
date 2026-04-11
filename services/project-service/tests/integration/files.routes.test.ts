import { beforeEach, describe, expect, it, vi } from 'vitest'

const projectsMocks = vi.hoisted(() => ({
  findProjectByIdAndUserId: vi.fn(),
  updateLastActive: vi.fn(),
}))

const fileMocks = vi.hoisted(() => ({
  findFilesByProject: vi.fn(),
  buildFileTree: vi.fn(),
  findFileById: vi.fn(),
  updateFile: vi.fn(),
  deleteFile: vi.fn(),
}))

vi.mock('../../src/db/queries/projects.queries.js', () => projectsMocks)
vi.mock('../../src/db/queries/projectFiles.queries.js', () => ({
  ...fileMocks,
  buildFileTree: fileMocks.buildFileTree,
}))

import { createApp } from '../../src/app.js'
import { signTestAccessToken } from '../jwt-test.js'

const uid = '550e8400-e29b-41d4-a716-446655440000'
const pid = '660e8400-e29b-41d4-a716-446655440001'
const fid = '770e8400-e29b-41d4-a716-446655440002'

describe('files routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    token = await signTestAccessToken({ sub: uid })
    projectsMocks.updateLastActive.mockResolvedValue(undefined)
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 4,
    } as never)
  })

  it('GET /projects/:id/files when phase < 3 → 403', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 2,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(403)
    const json = (await res.json()) as { success: false; error: { code: string } }
    expect(json.error.code).toBe('FILES_NOT_AVAILABLE')
  })

  it('GET /projects/:id/files when project missing → 404', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('GET /projects/:id/files → 200 { files, tree, totalFiles }', async () => {
    const files = [
      {
        id: fid,
        projectId: pid,
        path: 'src/a.ts',
        content: 'a',
        language: 'ts',
        agentType: 'frontend',
        isModified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never[]
    fileMocks.findFilesByProject.mockResolvedValue(files)
    fileMocks.buildFileTree.mockReturnValue([{ name: 'src', type: 'dir', children: [] }])

    const res = await app.request(`http://localhost/projects/${pid}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      data: { files: unknown[]; tree: unknown[]; totalFiles: number }
    }
    expect(json.data.totalFiles).toBe(1)
    expect(json.data.files).toHaveLength(1)
    expect(json.data.tree).toHaveLength(1)
    expect(fileMocks.findFilesByProject).toHaveBeenCalledWith(pid, undefined)
  })

  it('GET /projects/:id/files?agentType=backend → filtered list', async () => {
    fileMocks.findFilesByProject.mockResolvedValue([] as never)
    fileMocks.buildFileTree.mockReturnValue([])

    const res = await app.request(
      `http://localhost/projects/${pid}/files?agentType=backend`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    expect(res.status).toBe(200)
    expect(fileMocks.findFilesByProject).toHaveBeenCalledWith(pid, 'backend')
  })

  it('GET /projects/:id/files tree structure is correct hierarchy', async () => {
    const tree = [
      {
        name: 'src',
        type: 'dir',
        children: [{ name: 'index.ts', type: 'file', id: fid, path: 'src/index.ts' }],
      },
    ]
    fileMocks.findFilesByProject.mockResolvedValue([] as never)
    fileMocks.buildFileTree.mockReturnValue(tree)

    const res = await app.request(`http://localhost/projects/${pid}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = (await res.json()) as { data: { tree: typeof tree } }
    expect(json.data.tree[0]?.children?.[0]?.path).toBe('src/index.ts')
  })

  it('GET /projects/:id/files/:fileId → 200 with content', async () => {
    fileMocks.findFileById.mockResolvedValue({
      id: fid,
      projectId: pid,
      path: 'x.ts',
      content: 'body',
      language: 'ts',
      agentType: null,
      isModified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { content: string } }
    expect(json.data.content).toBe('body')
  })

  it('GET /projects/:id/files/:fileId when phase < 3 → 403', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 2,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(403)
  })

  it('GET /projects/:id/files/:fileId not found → 404', async () => {
    fileMocks.findFileById.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('PUT /projects/:id/files/:fileId when project missing → 404', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'x' }),
    })
    expect(res.status).toBe(404)
  })

  it('PUT /projects/:id/files/:fileId when phase < 3 → 403', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 2,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'x' }),
    })
    expect(res.status).toBe(403)
  })

  it('PUT /projects/:id/files/:fileId when update returns nothing → 404', async () => {
    fileMocks.findFileById.mockResolvedValue({
      id: fid,
      projectId: pid,
      path: 'x.ts',
      content: 'old',
      language: 'ts',
      agentType: null,
      isModified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)
    fileMocks.updateFile.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'new' }),
    })
    expect(res.status).toBe(404)
  })

  it('PUT /projects/:id/files/:fileId → 200 content updated, isModified=true', async () => {
    fileMocks.findFileById.mockResolvedValue({
      id: fid,
      projectId: pid,
      path: 'x.ts',
      content: 'old',
      language: 'ts',
      agentType: null,
      isModified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)
    fileMocks.updateFile.mockResolvedValue({
      id: fid,
      projectId: pid,
      path: 'x.ts',
      content: 'new',
      language: 'ts',
      agentType: null,
      isModified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'new' }),
    })
    expect(res.status).toBe(200)
    expect(projectsMocks.updateLastActive).toHaveBeenCalledWith(pid)
    const json = (await res.json()) as { data: { content: string; isModified: boolean } }
    expect(json.data.content).toBe('new')
    expect(json.data.isModified).toBe(true)
  })

  it('PUT /projects/:id/files/:fileId 600KB content → 413', async () => {
    fileMocks.findFileById.mockResolvedValue({
      id: fid,
      projectId: pid,
      path: 'x.ts',
      content: 'old',
      language: 'ts',
      agentType: null,
      isModified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const big = 'y'.repeat(600_000)
    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: big }),
    })
    expect(res.status).toBe(413)
    const json = (await res.json()) as { success: false; error: { code: string } }
    expect(json.error.code).toBe('FILE_TOO_LARGE')
  })

  it('DELETE /projects/:id/files/:fileId → 200', async () => {
    fileMocks.deleteFile.mockResolvedValue(true)

    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    expect(projectsMocks.updateLastActive).toHaveBeenCalledWith(pid)
    const json = (await res.json()) as { data: { fileId: string } }
    expect(json.data.fileId).toBe(fid)
  })

  it('DELETE /projects/:id/files/:fileId when phase < 3 → 403', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 2,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE /projects/:id/files/:fileId when project missing → 404', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('DELETE /projects/:id/files/:fileId not found → 404', async () => {
    fileMocks.deleteFile.mockResolvedValue(false)

    const res = await app.request(`http://localhost/projects/${pid}/files/${fid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })
})
