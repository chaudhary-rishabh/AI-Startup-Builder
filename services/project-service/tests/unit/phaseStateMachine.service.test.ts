import { beforeEach, describe, expect, it, vi } from 'vitest'

const projectsMocks = vi.hoisted(() => ({
  findProjectByIdAndUserId: vi.fn(),
  updateProject: vi.fn(),
}))

const phaseMocks = vi.hoisted(() => ({
  findCurrentPhaseOutput: vi.fn(),
}))

const publisherMocks = vi.hoisted(() => ({
  publishProjectPhaseAdvanced: vi.fn(),
}))

vi.mock('../../src/db/queries/projects.queries.js', () => projectsMocks)
vi.mock('../../src/db/queries/phaseOutputs.queries.js', () => phaseMocks)
vi.mock('../../src/events/publisher.js', () => publisherMocks)

import {
  advancePhase,
  validatePhaseCompletion,
} from '../../src/services/phaseStateMachine.service.js'

const uid = '550e8400-e29b-41d4-a716-446655440000'
const pid = '660e8400-e29b-41d4-a716-446655440001'
const now = new Date()

function baseProject(over: Record<string, unknown> = {}) {
  return {
    id: pid,
    userId: uid,
    name: 'P',
    currentPhase: 1,
    status: 'active' as const,
    mode: 'design' as const,
    phaseProgress: {
      '1': 'active',
      '2': 'locked',
      '3': 'locked',
      '4': 'locked',
      '5': 'locked',
      '6': 'locked',
    },
    ...over,
  }
}

function phase1CompleteData() {
  return {
    problem: 'p',
    solution: 's',
    icp: 'i',
    demandScore: 7,
    verdict: 'yes' as const,
  }
}

describe('validatePhaseCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns phase_output when no row', async () => {
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue(undefined)
    await expect(validatePhaseCompletion(pid, 1)).resolves.toEqual({
      valid: false,
      missingFields: ['phase_output'],
    })
  })

  it('returns phase_not_marked_complete when isComplete false', async () => {
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: false,
      outputData: phase1CompleteData(),
    } as never)
    await expect(validatePhaseCompletion(pid, 1)).resolves.toEqual({
      valid: false,
      missingFields: ['phase_not_marked_complete'],
    })
  })

  it('phase 1 checks problem, solution, icp, demandScore, verdict', async () => {
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: true,
      outputData: { ...phase1CompleteData(), problem: '' },
    } as never)
    const r = await validatePhaseCompletion(pid, 1)
    expect(r.valid).toBe(false)
    expect(r.missingFields).toContain('problem')
  })

  it('phase 1 valid when all required fields present', async () => {
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: true,
      outputData: phase1CompleteData(),
    } as never)
    await expect(validatePhaseCompletion(pid, 1)).resolves.toEqual({
      valid: true,
      missingFields: [],
    })
  })

  it('phase 2 checks features, userStories, stacks', async () => {
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: true,
      outputData: {
        features: [{ name: 'f', priority: 'must', description: 'd' }],
        userStories: [],
        frontendStack: 'react',
        backendStack: 'node',
        dbChoice: 'pg',
      },
    } as never)
    const r = await validatePhaseCompletion(pid, 2)
    expect(r.valid).toBe(false)
    expect(r.missingFields).toContain('userStories')
  })

  it('phase 2 valid with arrays and stacks', async () => {
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: true,
      outputData: {
        features: [{ name: 'f', priority: 'must', description: 'd' }],
        userStories: [{ role: 'u', want: 'w', soThat: 's', acceptance: [] }],
        frontendStack: 'react',
        backendStack: 'node',
        dbChoice: 'pg',
      },
    } as never)
    await expect(validatePhaseCompletion(pid, 2)).resolves.toEqual({
      valid: true,
      missingFields: [],
    })
  })
})

describe('advancePhase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    publisherMocks.publishProjectPhaseAdvanced.mockResolvedValue(undefined)
  })

  it('throws 404 when project not found', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(undefined)
    await expect(advancePhase(pid, uid, 2)).rejects.toMatchObject({
      status: 404,
      code: 'PROJECT_NOT_FOUND',
    })
  })

  it('throws PROJECT_NOT_ACTIVE when archived', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(
      baseProject({ status: 'archived' }) as never,
    )
    await expect(advancePhase(pid, uid, 2)).rejects.toMatchObject({
      status: 422,
      code: 'PROJECT_NOT_ACTIVE',
    })
  })

  it('throws ALREADY_AT_FINAL_PHASE from phase 6', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(
      baseProject({ currentPhase: 6 }) as never,
    )
    await expect(advancePhase(pid, uid, 7)).rejects.toMatchObject({
      status: 422,
      code: 'ALREADY_AT_FINAL_PHASE',
    })
  })

  it('throws INVALID_PHASE_TRANSITION when skipping', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(baseProject() as never)
    await expect(advancePhase(pid, uid, 3)).rejects.toMatchObject({
      status: 422,
      code: 'INVALID_PHASE_TRANSITION',
    })
  })

  it('throws PHASE_INCOMPLETE when validation fails', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(baseProject() as never)
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: true,
      outputData: { problem: 'x' },
    } as never)
    await expect(advancePhase(pid, uid, 2)).rejects.toMatchObject({
      status: 422,
      code: 'PHASE_INCOMPLETE',
      missingFields: expect.any(Array),
    })
  })

  it('succeeds 1→2 when phase 1 complete', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(baseProject() as never)
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: true,
      outputData: phase1CompleteData(),
    } as never)
    const updated = {
      ...baseProject({ currentPhase: 2, mode: 'design' }),
      phaseProgress: {
        '1': 'complete',
        '2': 'active',
        '3': 'locked',
        '4': 'locked',
        '5': 'locked',
        '6': 'locked',
      },
      updatedAt: now,
    }
    projectsMocks.updateProject.mockResolvedValue(updated as never)

    const result = await advancePhase(pid, uid, 2)
    expect(result.currentPhase).toBe(2)
    expect(result.mode).toBe('design')
    expect(publisherMocks.publishProjectPhaseAdvanced).toHaveBeenCalledWith(pid, uid, 1, 2)
    expect(projectsMocks.updateProject).toHaveBeenCalled()
  })

  it('advancing to phase 3 sets mode design', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(
      baseProject({ currentPhase: 2, mode: 'dev' }) as never,
    )
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: true,
      outputData: {
        features: [{ name: 'f', priority: 'must', description: 'd' }],
        userStories: [{ role: 'u', want: 'w', soThat: 's', acceptance: [] }],
        frontendStack: 'r',
        backendStack: 'n',
        dbChoice: 'p',
      },
    } as never)
    const updated = {
      ...baseProject({ currentPhase: 3, mode: 'design' }),
      phaseProgress: {},
    }
    projectsMocks.updateProject.mockResolvedValue(updated as never)

    const result = await advancePhase(pid, uid, 3)
    expect(result.mode).toBe('design')
    expect(projectsMocks.updateProject).toHaveBeenCalledWith(
      pid,
      uid,
      expect.objectContaining({ mode: 'design', currentPhase: 3 }),
    )
  })

  it('advancing to phase 4 sets mode dev', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(
      baseProject({ currentPhase: 3, mode: 'design' }) as never,
    )
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: true,
      outputData: { canvasData: [{}] },
    } as never)
    const updated = { ...baseProject({ currentPhase: 4, mode: 'dev' }), phaseProgress: {} }
    projectsMocks.updateProject.mockResolvedValue(updated as never)

    const result = await advancePhase(pid, uid, 4)
    expect(result.mode).toBe('dev')
  })

  it('advancing to phase 2 keeps existing mode', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(
      baseProject({ mode: 'dev' }) as never,
    )
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: true,
      outputData: phase1CompleteData(),
    } as never)
    const updated = { ...baseProject({ currentPhase: 2, mode: 'dev' }), phaseProgress: {} }
    projectsMocks.updateProject.mockResolvedValue(updated as never)

    const result = await advancePhase(pid, uid, 2)
    expect(result.mode).toBe('dev')
  })

  it('updates phaseProgress with complete/active/locked', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(baseProject() as never)
    phaseMocks.findCurrentPhaseOutput.mockResolvedValue({
      isComplete: true,
      outputData: phase1CompleteData(),
    } as never)
    let captured: Record<string, unknown> = {}
    projectsMocks.updateProject.mockImplementation(async (_id, _uid, data) => {
      captured = data as Record<string, unknown>
      return { ...baseProject({ currentPhase: 2 }), ...data } as never
    })

    await advancePhase(pid, uid, 2)
    const progress = captured['phaseProgress'] as Record<string, string>
    expect(progress['1']).toBe('complete')
    expect(progress['2']).toBe('active')
    expect(progress['3']).toBe('locked')
    expect(progress['6']).toBe('locked')
  })
})
