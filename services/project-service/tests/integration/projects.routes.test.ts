import { beforeEach, describe, expect, it, vi } from 'vitest'

const projectsMocks = vi.hoisted(() => ({
  findProjectsByUserId: vi.fn(),
  searchProjectsByUserId: vi.fn(),
  findAllProjects: vi.fn(),
  createProject: vi.fn(),
  findProjectByIdAndUserId: vi.fn(),
  updateProject: vi.fn(),
  softDeleteProject: vi.fn(),
  toggleStar: vi.fn(),
  archiveProject: vi.fn(),
  restoreProject: vi.fn(),
  duplicateProject: vi.fn(),
  countActiveProjectsByUserId: vi.fn(),
  updateLastActive: vi.fn(),
  initialPhaseProgress: vi.fn(() => ({
    '1': 'active',
    '2': 'locked',
    '3': 'locked',
    '4': 'locked',
    '5': 'locked',
    '6': 'locked',
  })),
}))

const phaseMocks = vi.hoisted(() => ({
  findAllPhaseOutputs: vi.fn(),
}))

const publisherMocks = vi.hoisted(() => ({
  publishProjectCreated: vi.fn(),
  publishProjectDeleted: vi.fn(),
}))

vi.mock('../../src/db/queries/projects.queries.js', () => projectsMocks)
vi.mock('../../src/db/queries/phaseOutputs.queries.js', () => phaseMocks)
vi.mock('../../src/events/publisher.js', () => publisherMocks)

const { createApp } = await import('../../src/app.js')
const { signTestAccessToken } = await import('../jwt-test.js')

const uid = '550e8400-e29b-41d4-a716-446655440000'
const pid = '660e8400-e29b-41d4-a716-446655440001'
const now = new Date()

function baseProject(over: Record<string, unknown> = {}) {
  return {
    id: pid,
    userId: uid,
    name: 'My Project',
    description: null,
    emoji: '🚀',
    currentPhase: 1,
    status: 'active' as const,
    isStarred: false,
    mode: 'design' as const,
    phaseProgress: {},
    contextSummary: null,
    lastActiveAt: now,
    launchedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...over,
  }
}

describe('projects routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string
  let adminToken: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    token = await signTestAccessToken({ sub: uid })
    adminToken = await signTestAccessToken({ sub: uid, role: 'admin' })
    publisherMocks.publishProjectCreated.mockResolvedValue(undefined)
    publisherMocks.publishProjectDeleted.mockResolvedValue(undefined)
    projectsMocks.initialPhaseProgress.mockReturnValue({
      '1': 'active',
      '2': 'locked',
      '3': 'locked',
      '4': 'locked',
      '5': 'locked',
      '6': 'locked',
    })
  })

  it('GET /projects without auth → 401', async () => {
    const res = await app.request('http://localhost/projects')
    expect(res.status).toBe(401)
  })

  it('GET /projects → 200 paginated list', async () => {
    const p = baseProject()
    projectsMocks.findProjectsByUserId.mockResolvedValue({ data: [p], total: 1 })

    const res = await app.request('http://localhost/projects', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      success: boolean
      data: { projects: unknown[] }
      meta: { total: number }
    }
    expect(json.success).toBe(true)
    expect(json.data.projects).toHaveLength(1)
    expect(json.meta.total).toBe(1)
  })

  it('GET /projects/search?q=ab → 200 results', async () => {
    projectsMocks.searchProjectsByUserId.mockResolvedValue([
      {
        id: pid,
        name: 'Abacus',
        emoji: '🚀',
        currentPhase: 1,
        isStarred: false,
        status: 'active',
      },
    ])

    const res = await app.request('http://localhost/projects/search?q=ab', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { results: unknown[]; total: number } }
    expect(json.data.results).toHaveLength(1)
    expect(json.data.total).toBe(1)
  })

  it('GET /projects/search?q=a → 400', async () => {
    const res = await app.request('http://localhost/projects/search?q=a', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(400)
  })

  it('POST /projects valid → 201 with project at phase 1', async () => {
    const p = baseProject()
    projectsMocks.countActiveProjectsByUserId.mockResolvedValue(0)
    projectsMocks.createProject.mockResolvedValue(p)

    const res = await app.request('http://localhost/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Startup' }),
    })
    expect(res.status).toBe(201)
    const json = (await res.json()) as { data: { project: { currentPhase: number } } }
    expect(json.data.project.currentPhase).toBe(1)
    expect(publisherMocks.publishProjectCreated).toHaveBeenCalled()
  })

  it('POST /projects at free limit → 422 PROJECT_LIMIT_EXCEEDED', async () => {
    projectsMocks.countActiveProjectsByUserId.mockResolvedValue(3)

    const res = await app.request('http://localhost/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'X' }),
    })
    expect(res.status).toBe(422)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe('PROJECT_LIMIT_EXCEEDED')
  })

  it('POST /projects enterprise plan ignores project limit', async () => {
    const entToken = await signTestAccessToken({ sub: uid, plan: 'enterprise' })
    projectsMocks.countActiveProjectsByUserId.mockResolvedValue(99)
    projectsMocks.createProject.mockResolvedValue(baseProject())

    const res = await app.request('http://localhost/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${entToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Many' }),
    })
    expect(res.status).toBe(201)
  })

  it('GET /projects/:id valid → 200 with phaseOutputs', async () => {
    const p = baseProject()
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(p)
    phaseMocks.findAllPhaseOutputs.mockResolvedValue([{ id: 'o1', phase: 1 } as never])

    const res = await app.request(`http://localhost/projects/${pid}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { phaseOutputs: unknown[] } }
    expect(json.data.phaseOutputs).toHaveLength(1)
    expect(projectsMocks.updateLastActive).toHaveBeenCalledWith(pid)
  })

  it('GET /projects/:id wrong user → 404', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('PATCH /projects/:id valid → 200', async () => {
    const p = baseProject({ name: 'Updated' })
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(baseProject())
    projectsMocks.updateProject.mockResolvedValue(p)

    const res = await app.request(`http://localhost/projects/${pid}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated' }),
    })
    expect(res.status).toBe(200)
  })

  it('DELETE /projects/:id → 200 soft-deleted', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(baseProject())
    projectsMocks.softDeleteProject.mockResolvedValue({
      deleted: true,
      deletedAt: now.toISOString(),
    })

    const res = await app.request(`http://localhost/projects/${pid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    expect(publisherMocks.publishProjectDeleted).toHaveBeenCalled()
  })

  it('POST /projects/:id/star toggles isStarred', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(baseProject())
    projectsMocks.toggleStar.mockResolvedValueOnce(baseProject({ isStarred: true }))
    const res1 = await app.request(`http://localhost/projects/${pid}/star`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res1.status).toBe(200)
    const j1 = (await res1.json()) as { data: { isStarred: boolean } }
    expect(j1.data.isStarred).toBe(true)

    projectsMocks.toggleStar.mockResolvedValueOnce(baseProject({ isStarred: false }))
    const res2 = await app.request(`http://localhost/projects/${pid}/star`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const j2 = (await res2.json()) as { data: { isStarred: boolean } }
    expect(j2.data.isStarred).toBe(false)
  })

  it('POST /projects/:id/archive → 200', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(baseProject())
    projectsMocks.archiveProject.mockResolvedValue(baseProject({ status: 'archived' }))

    const res = await app.request(`http://localhost/projects/${pid}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
  })

  it('POST /projects/:id/archive already archived → 422', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(baseProject({ status: 'archived' }))

    const res = await app.request(`http://localhost/projects/${pid}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(422)
  })

  it('POST /projects/:id/restore → 200', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(
      baseProject({ status: 'archived' }),
    )
    projectsMocks.countActiveProjectsByUserId.mockResolvedValue(0)
    projectsMocks.restoreProject.mockResolvedValue(baseProject())

    const res = await app.request(`http://localhost/projects/${pid}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
  })

  it('POST /projects/:id/duplicate → 201 new project at phase 1', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(baseProject())
    projectsMocks.countActiveProjectsByUserId.mockResolvedValue(0)
    const copy = baseProject({ id: '770e8400-e29b-41d4-a716-446655440002', currentPhase: 1 })
    projectsMocks.duplicateProject.mockResolvedValue(copy)

    const res = await app.request(`http://localhost/projects/${pid}/duplicate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(201)
    const json = (await res.json()) as { data: { currentPhase: number; duplicatedFrom: string } }
    expect(json.data.currentPhase).toBe(1)
    expect(json.data.duplicatedFrom).toBe(pid)
  })

  it('GET /projects/admin without admin JWT → 403', async () => {
    const res = await app.request('http://localhost/projects/admin', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(403)
  })

  it('GET /projects/admin with admin JWT → 200', async () => {
    projectsMocks.findAllProjects.mockResolvedValue({ data: [baseProject()], total: 1 })

    const res = await app.request('http://localhost/projects/admin', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { projects: unknown[] } }
    expect(json.data.projects).toHaveLength(1)
  })
})
