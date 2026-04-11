import { beforeEach, describe, expect, it, vi } from 'vitest'

const projectsMocks = vi.hoisted(() => ({
  findProjectByIdAndUserId: vi.fn(),
}))

const phaseMocks = vi.hoisted(() => ({
  findAllPhaseOutputs: vi.fn(),
}))

vi.mock('../../src/db/queries/projects.queries.js', () => projectsMocks)
vi.mock('../../src/db/queries/phaseOutputs.queries.js', () => phaseMocks)

import {
  buildProjectContext,
  estimateTokenCount,
} from '../../src/services/contextBuilder.service.js'

const uid = '550e8400-e29b-41d4-a716-446655440000'
const pid = '660e8400-e29b-41d4-a716-446655440001'

describe('estimateTokenCount', () => {
  it('uses stringify length / 4', () => {
    expect(estimateTokenCount({ a: 'x' })).toBeGreaterThan(0)
  })
})

describe('buildProjectContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws 404 when project missing', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue(undefined)
    await expect(buildProjectContext(pid, uid)).rejects.toMatchObject({ status: 404 })
  })

  it('returns all phase outputs when present', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      name: 'MyCo',
      currentPhase: 3,
    } as never)
    phaseMocks.findAllPhaseOutputs.mockResolvedValue([
      { phase: 1, outputData: { problem: 'p', solution: 's', verdict: 'yes', demandScore: 1 } },
      {
        phase: 2,
        outputData: {
          features: [{ name: 'f', priority: 'must', description: 'd' }],
          userStories: [],
          frontendStack: 'r',
          backendStack: 'n',
          dbChoice: 'p',
          flowSteps: [],
          wireframes: [],
          designSystem: {},
          componentList: [],
          authPlan: '',
        },
      },
    ] as never)

    const ctx = await buildProjectContext(pid, uid)
    expect(ctx.projectId).toBe(pid)
    expect(ctx.projectName).toBe('MyCo')
    expect(ctx.currentPhase).toBe(3)
    expect(ctx.phase1Output?.problem).toBe('p')
    expect(ctx.phase2Output?.frontendStack).toBe('r')
  })

  it('omits phases without outputs', async () => {
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      name: 'X',
      currentPhase: 1,
    } as never)
    phaseMocks.findAllPhaseOutputs.mockResolvedValue([])

    const ctx = await buildProjectContext(pid, uid)
    expect(ctx.phase1Output).toBeUndefined()
    expect(ctx.phase2Output).toBeUndefined()
  })

  it('compresses when estimated tokens exceed 80k', async () => {
    const bigContent = 'x'.repeat(400_000)
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      name: 'Huge',
      currentPhase: 5,
    } as never)
    phaseMocks.findAllPhaseOutputs.mockResolvedValue([
      {
        phase: 1,
        outputData: {
          problem: 'p',
          solution: 's',
          icp: 'i',
          competitors: [],
          marketGap: '',
          pricingSuggest: '',
          demandScore: 5,
          risks: [],
          verdict: 'yes',
        },
      },
      {
        phase: 4,
        outputData: {
          files: [{ path: '/a.ts', content: bigContent, language: 'ts', agentType: 'frontend' }],
        },
      },
    ] as never)

    const ctx = await buildProjectContext(pid, uid)
    expect(ctx.wasCompressed).toBe(true)
    const p4 = ctx.phase4Output as { filePaths?: unknown[] } | undefined
    expect(p4?.filePaths).toBeDefined()
    expect(JSON.stringify(ctx).length).toBeLessThan(bigContent.length)
  })

  it('compressed phase 1 keeps summary fields only', async () => {
    const huge = { extra: 'y'.repeat(400_000) }
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      name: 'C',
      currentPhase: 2,
    } as never)
    phaseMocks.findAllPhaseOutputs.mockResolvedValue([
      {
        phase: 1,
        outputData: {
          problem: 'p',
          solution: 's',
          icp: 'i',
          competitors: [],
          marketGap: '',
          pricingSuggest: '',
          demandScore: 3,
          risks: [],
          verdict: 'yes',
          ...huge,
        },
      },
    ] as never)

    const ctx = await buildProjectContext(pid, uid)
    expect(ctx.wasCompressed).toBe(true)
    expect(ctx.phase1Output?.problem).toBe('p')
    expect(ctx.phase1Output?.solution).toBe('s')
    expect((ctx.phase1Output as { extra?: string }).extra).toBeUndefined()
  })
})
