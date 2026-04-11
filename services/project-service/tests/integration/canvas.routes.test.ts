import { beforeEach, describe, expect, it, vi } from 'vitest'

const projectsMocks = vi.hoisted(() => ({
  findProjectByIdAndUserId: vi.fn(),
  updateLastActive: vi.fn(),
}))

const canvasMocks = vi.hoisted(() => ({
  findCanvasByProjectId: vi.fn(),
  createCanvas: vi.fn(),
  upsertCanvas: vi.fn(),
}))

vi.mock('../../src/db/queries/projects.queries.js', () => projectsMocks)
vi.mock('../../src/db/queries/designCanvas.queries.js', () => canvasMocks)

import { createApp } from '../../src/app.js'
import { signTestAccessToken } from '../jwt-test.js'

const uid = '550e8400-e29b-41d4-a716-446655440000'
const pid = '660e8400-e29b-41d4-a716-446655440001'

describe('canvas routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    token = await signTestAccessToken({ sub: uid })
    projectsMocks.updateLastActive.mockResolvedValue(undefined)
  })

  it('GET /projects/:id/canvas without auth → 401', async () => {
    const res = await app.request(`http://localhost/projects/${pid}/canvas`)
    expect(res.status).toBe(401)
  })

  it('GET /projects/:id/canvas serializes string updatedAt', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 3,
    } as never)
    canvasMocks.findCanvasByProjectId.mockResolvedValue({
      id: 'c1',
      projectId: pid,
      canvasData: [],
      pages: [],
      designTokens: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      updatedAt: '2024-01-01T00:00:00.000Z',
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/canvas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { updatedAt: string } }
    expect(json.data.updatedAt).toBe('2024-01-01T00:00:00.000Z')
  })

  it('GET /projects/:id/canvas → 200 with canvas data', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 3,
    } as never)
    canvasMocks.findCanvasByProjectId.mockResolvedValue({
      id: 'c1',
      projectId: pid,
      canvasData: [{ x: 1 }],
      pages: [],
      designTokens: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      updatedAt: new Date('2024-06-01T00:00:00.000Z'),
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/canvas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      data: { canvasData: unknown[]; projectId: string }
    }
    expect(json.data.projectId).toBe(pid)
    expect(json.data.canvasData).toEqual([{ x: 1 }])
  })

  it('GET /projects/:id/canvas when project on phase 1 → 404 CANVAS_NOT_AVAILABLE', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 1,
    } as never)
    canvasMocks.findCanvasByProjectId.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}/canvas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
    const json = (await res.json()) as { success: false; error: { code: string } }
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('CANVAS_NOT_AVAILABLE')
  })

  it('GET /projects/:id/canvas when phase ≥ 3 and no canvas → auto-creates and returns', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 3,
    } as never)
    canvasMocks.findCanvasByProjectId.mockResolvedValueOnce(undefined)
    canvasMocks.createCanvas.mockResolvedValue({
      id: 'newc',
      projectId: pid,
      canvasData: [],
      pages: [],
      designTokens: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      updatedAt: new Date(),
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/canvas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    expect(canvasMocks.createCanvas).toHaveBeenCalledWith(pid)
    const json = (await res.json()) as { data: { id: string } }
    expect(json.data.id).toBe('newc')
  })

  it('GET /projects/:id/canvas wrong project → 404', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}/canvas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('PUT /projects/:id/canvas valid → 200 updated canvas', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 3,
    } as never)
    canvasMocks.upsertCanvas.mockResolvedValue({
      id: 'c1',
      projectId: pid,
      canvasData: [{ k: 2 }],
      pages: [],
      designTokens: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      updatedAt: new Date(),
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/canvas`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ canvasData: [{ k: 2 }] }),
    })
    expect(res.status).toBe(200)
    expect(projectsMocks.updateLastActive).toHaveBeenCalledWith(pid)
    const json = (await res.json()) as { data: { canvasData: unknown[] } }
    expect(json.data.canvasData).toEqual([{ k: 2 }])
  })

  it('PUT /projects/:id/canvas when project missing → 404', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}/canvas`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ canvasData: [] }),
    })
    expect(res.status).toBe(404)
  })

  it('PUT /projects/:id/canvas when phase < 3 → 403', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 2,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/canvas`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ canvasData: [] }),
    })
    expect(res.status).toBe(403)
    const json = (await res.json()) as { success: false; error: { code: string } }
    expect(json.error.code).toBe('CANVAS_NOT_AVAILABLE')
  })

  it('PUT /projects/:id/canvas with 6MB payload → 413 CANVAS_TOO_LARGE', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 3,
    } as never)
    const huge = 'x'.repeat(5_000_000)

    const res = await app.request(`http://localhost/projects/${pid}/canvas`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pages: [huge] }),
    })
    expect(res.status).toBe(413)
    const json = (await res.json()) as { success: false; error: { code: string } }
    expect(json.error.code).toBe('CANVAS_TOO_LARGE')
  })
})
