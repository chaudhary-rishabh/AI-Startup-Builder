import { beforeEach, describe, expect, it, vi } from 'vitest'

const advanceMocks = vi.hoisted(() => ({
  advancePhase: vi.fn(),
}))

const projectsMocks = vi.hoisted(() => ({
  findProjectByIdAndUserId: vi.fn(),
}))

const phaseMocks = vi.hoisted(() => ({
  findCurrentPhaseOutput: vi.fn(),
  savePhaseOutput: vi.fn(),
  markPhaseComplete: vi.fn(),
}))

const lastActiveMocks = vi.hoisted(() => ({
  updateLastActive: vi.fn(),
}))

vi.mock('../../src/services/phaseStateMachine.service.js', () => advanceMocks)
vi.mock('../../src/db/queries/projects.queries.js', () => ({
  ...projectsMocks,
  updateLastActive: lastActiveMocks.updateLastActive,
}))
vi.mock('../../src/db/queries/phaseOutputs.queries.js', () => phaseMocks)

import { createApp } from '../../src/app.js'
import * as projectsQueries from '../../src/db/queries/projects.queries.js'
import { signTestAccessToken } from '../jwt-test.js'

const uid = '550e8400-e29b-41d4-a716-446655440000'
const pid = '660e8400-e29b-41d4-a716-446655440001'
const now = new Date()

describe('phases routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    token = await signTestAccessToken({ sub: uid })
    lastActiveMocks.updateLastActive.mockResolvedValue(undefined)
  })

  it('POST /projects/:id/advance-phase without auth → 401', async () => {
    const res = await app.request(`http://localhost/projects/${pid}/advance-phase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPhase: 2 }),
    })
    expect(res.status).toBe(401)
  })

  it('POST advance-phase valid → 200', async () => {
    advanceMocks.advancePhase.mockResolvedValue({
      id: pid,
      currentPhase: 2,
      mode: 'design',
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/advance-phase`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetPhase: 2 }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      data: { previousPhase: number; currentPhase: number; phaseName: string }
    }
    expect(json.data.previousPhase).toBe(1)
    expect(json.data.currentPhase).toBe(2)
    expect(json.data.phaseName).toBe('Plan')
  })

  it('POST advance-phase skip phase → 422', async () => {
    const err = Object.assign(new Error('skip'), {
      status: 422,
      code: 'INVALID_PHASE_TRANSITION',
    })
    advanceMocks.advancePhase.mockRejectedValue(err)

    const res = await app.request(`http://localhost/projects/${pid}/advance-phase`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetPhase: 3 }),
    })
    expect(res.status).toBe(422)
  })

  it('POST advance-phase incomplete → 422 with missingFields', async () => {
    const err = Object.assign(new Error('inc'), {
      status: 422,
      code: 'PHASE_INCOMPLETE',
      missingFields: ['problem'],
    })
    advanceMocks.advancePhase.mockRejectedValue(err)

    const res = await app.request(`http://localhost/projects/${pid}/advance-phase`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetPhase: 2 }),
    })
    expect(res.status).toBe(422)
    const json = (await res.json()) as { error: { details?: { field: string }[] } }
    expect(json.error.details?.some((d) => d.field === 'problem')).toBe(true)
  })

  it('GET /projects/:id/phases/1 → 200', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 2,
    } as never)
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: true,
      version: 2,
      outputData: { a: 1 },
      updatedAt: now,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/phases/1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { data: unknown; version: number } }
    expect(json.data.version).toBe(2)
  })

  it('GET phases/3 when on phase 1 → 403', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 1,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/phases/3`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(403)
  })

  it('GET phases/1 no output → 200 data null', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 2,
    } as never)
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}/phases/1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { data: null; isComplete: boolean } }
    expect(json.data.data).toBeNull()
    expect(json.data.isComplete).toBe(false)
  })

  it('PUT phases/1 valid → 200', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 1,
    } as never)
    phaseMocks.savePhaseOutput.mockResolvedValue({
      version: 1,
      isComplete: false,
      updatedAt: now,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/phases/1`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { x: 1 } }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { version: number } }
    expect(json.data.version).toBe(1)
    expect(vi.mocked(projectsQueries.updateLastActive)).toHaveBeenCalledWith(pid)
  })

  it('PUT phases/2 when on phase 1 → 403', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 1,
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/phases/2`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: {} }),
    })
    expect(res.status).toBe(403)
  })

  it('PUT phases/1 isComplete=true calls markPhaseComplete', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      currentPhase: 1,
    } as never)
    phaseMocks.savePhaseOutput.mockResolvedValue({
      version: 2,
      isComplete: true,
      updatedAt: now,
    } as never)
    phaseMocks.markPhaseComplete.mockResolvedValue({} as never)

    const res = await app.request(`http://localhost/projects/${pid}/phases/1`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { ok: true }, isComplete: true }),
    })
    expect(res.status).toBe(200)
    expect(phaseMocks.markPhaseComplete).toHaveBeenCalledWith(pid, 1)
  })
})
