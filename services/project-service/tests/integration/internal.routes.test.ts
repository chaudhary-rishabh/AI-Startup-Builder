import { beforeEach, describe, expect, it, vi } from 'vitest'

const contextMocks = vi.hoisted(() => ({
  buildProjectContext: vi.fn(),
}))

const projectsMocks = vi.hoisted(() => ({
  findProjectById: vi.fn(),
}))

const phaseMocks = vi.hoisted(() => ({
  savePhaseOutput: vi.fn(),
}))

const lastActiveMocks = vi.hoisted(() => ({
  updateLastActive: vi.fn(),
}))

const fileMocks = vi.hoisted(() => ({
  upsertFile: vi.fn(),
}))

const canvasMocks = vi.hoisted(() => ({
  findCanvasByProjectId: vi.fn(),
  upsertCanvas: vi.fn(),
}))

vi.mock('../../src/services/contextBuilder.service.js', () => contextMocks)
vi.mock('../../src/db/queries/projects.queries.js', () => ({
  ...projectsMocks,
  updateLastActive: lastActiveMocks.updateLastActive,
}))
vi.mock('../../src/db/queries/phaseOutputs.queries.js', () => phaseMocks)
vi.mock('../../src/db/queries/projectFiles.queries.js', () => fileMocks)
vi.mock('../../src/db/queries/designCanvas.queries.js', () => canvasMocks)

import { createApp } from '../../src/app.js'

const uid = '550e8400-e29b-41d4-a716-446655440000'
const pid = '660e8400-e29b-41d4-a716-446655440001'

describe('internal routes', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    vi.clearAllMocks()
    app = createApp()
    lastActiveMocks.updateLastActive.mockResolvedValue(undefined)
  })

  it('GET /internal/projects/:id/context requires userId', async () => {
    const res = await app.request(`http://localhost/internal/projects/${pid}/context`)
    expect(res.status).toBe(400)
  })

  it('GET /internal/projects/:id/context returns context', async () => {
    contextMocks.buildProjectContext.mockResolvedValue({
      projectId: pid,
      projectName: 'X',
      currentPhase: 1,
    })

    const res = await app.request(
      `http://localhost/internal/projects/${pid}/context?userId=${encodeURIComponent(uid)}`,
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { projectName: string } }
    expect(json.data.projectName).toBe('X')
  })

  it('POST /internal/projects/:id/phases/:phase/output saves', async () => {
    phaseMocks.savePhaseOutput.mockResolvedValue({ version: 3 } as never)

    const res = await app.request(`http://localhost/internal/projects/${pid}/phases/2/output`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputData: { a: 1 }, agentType: 'prd_generator' }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { version: number } }
    expect(json.data.version).toBe(3)
  })

  it('GET /internal/projects/:id returns project', async () => {
    projectsMocks.findProjectById.mockResolvedValue({
      id: pid,
      currentPhase: 2,
      mode: 'design',
    } as never)

    const res = await app.request(`http://localhost/internal/projects/${pid}`)
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { project: { id: string } } }
    expect(json.data.project.id).toBe(pid)
  })

  it('POST /internal/projects/:id/files upserts file', async () => {
    fileMocks.upsertFile.mockResolvedValue({
      id: 'f1',
      path: 'src/a.ts',
    } as never)

    const res = await app.request(`http://localhost/internal/projects/${pid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'src/a.ts', content: 'x', agentType: 'backend' }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { saved: boolean; file: { id: string } } }
    expect(json.data.saved).toBe(true)
    expect(json.data.file.id).toBe('f1')
  })

  it('POST /internal/projects/:id/files/batch upserts multiple', async () => {
    fileMocks.upsertFile
      .mockResolvedValueOnce({ id: 'a', path: 'a.ts' } as never)
      .mockResolvedValueOnce({ id: 'b', path: 'b.ts' } as never)

    const res = await app.request(`http://localhost/internal/projects/${pid}/files/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [
          { path: 'a.ts', content: '1' },
          { path: 'b.ts', content: '2' },
        ],
      }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { saved: number; files: { id: string }[] } }
    expect(json.data.saved).toBe(2)
    expect(json.data.files).toHaveLength(2)
  })

  it('GET /internal/projects/:id/canvas returns 404 when missing', async () => {
    canvasMocks.findCanvasByProjectId.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/internal/projects/${pid}/canvas`)
    expect(res.status).toBe(404)
  })

  it('GET /internal/projects/:id/canvas returns canvas', async () => {
    canvasMocks.findCanvasByProjectId.mockResolvedValue({
      id: 'c1',
      projectId: pid,
      canvasData: [],
      pages: [],
      designTokens: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      updatedAt: new Date(),
    } as never)

    const res = await app.request(`http://localhost/internal/projects/${pid}/canvas`)
    expect(res.status).toBe(200)
  })

  it('PUT /internal/projects/:id/canvas upserts', async () => {
    canvasMocks.upsertCanvas.mockResolvedValue({
      id: 'c1',
      projectId: pid,
      canvasData: [{ z: 1 }],
      pages: [],
      designTokens: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      updatedAt: new Date(),
    } as never)

    const res = await app.request(`http://localhost/internal/projects/${pid}/canvas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvasData: [{ z: 1 }] }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { canvasData: unknown[] } }
    expect(json.data.canvasData).toEqual([{ z: 1 }])
  })
})
