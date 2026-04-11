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

vi.mock('../../src/services/contextBuilder.service.js', () => contextMocks)
vi.mock('../../src/db/queries/projects.queries.js', () => ({
  ...projectsMocks,
  updateLastActive: lastActiveMocks.updateLastActive,
}))
vi.mock('../../src/db/queries/phaseOutputs.queries.js', () => phaseMocks)

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
})
