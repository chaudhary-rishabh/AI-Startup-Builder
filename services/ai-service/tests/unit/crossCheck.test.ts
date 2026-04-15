import { describe, expect, it } from 'vitest'

import type { ProjectContext } from '@repo/types'

import {
  crossCheck0,
  crossCheck1A,
  crossCheck1B,
  crossCheck2,
  crossCheck3A,
  crossCheck3B,
  crossCheck3C,
} from '../../src/services/crossCheck.service.js'
import type { FileSpec } from '../../src/types/phase4.types.js'

describe('crossCheck', () => {
  it('crossCheck1A: passes for valid idea output', () => {
    const out = {
      problem: 'Small businesses lose hours reconciling invoices manually each week.',
      solution: 'We provide automated invoice matching with bank feeds and exception queues.',
      icp: { description: 'Office managers at 10–50 person logistics firms in North America.' },
      clarityScore: 55,
    }
    const r = crossCheck1A(out)
    expect(r.passed).toBe(true)
    expect(r.issues).toHaveLength(0)
  })

  it('crossCheck1A: auto-fixes clarityScore out of range to 50', () => {
    const out = {
      problem: 'Long enough problem statement here for tests.',
      solution: 'Long enough solution text here for the unit tests to pass validation rules.',
      icp: { description: 'Office managers at logistics firms with clear scope.' },
      clarityScore: 900,
    }
    const r = crossCheck1A(out)
    expect(out['clarityScore']).toBe(50)
    expect(r.autoFixed).toBe(true)
    expect(r.passed).toBe(true)
  })

  it('crossCheck1A: fails for generic ICP "people"', () => {
    const out = {
      problem: 'Long enough problem statement here for tests.',
      solution: 'Long enough solution text here for the unit tests to pass validation rules.',
      icp: { description: 'people' },
      clarityScore: 40,
    }
    const r = crossCheck1A(out)
    expect(r.passed).toBe(false)
  })

  it('crossCheck1B: auto-fixes invalid verdict to pivot', () => {
    const out: Record<string, unknown> = {
      verdict: 'maybe',
      competitors: [{ name: 'c' }],
      demandScore: 40,
      risks: [
        { description: 'r1', severity: 'low', mitigation: 'm' },
        { description: 'r2', severity: 'low', mitigation: 'm' },
      ],
    }
    crossCheck1B(out)
    expect(out['verdict']).toBe('pivot')
  })

  it('crossCheck1B: auto-fixes missing competitors to []', () => {
    const out: Record<string, unknown> = {
      verdict: 'yes',
      demandScore: 40,
      risks: [
        { description: 'r1', severity: 'low', mitigation: 'm' },
        { description: 'r2', severity: 'low', mitigation: 'm' },
      ],
    }
    crossCheck1B(out)
    expect(out['competitors']).toEqual([])
  })

  it('crossCheck2: passes when all phase2 outputs present', () => {
    const context = {
      projectId: 'p',
      projectName: 'P',
      currentPhase: 2,
      phase2Output: {
        features: [{ name: 'Billing', priority: 'must', description: 'd' }],
        steps: [{ id: '1', label: 'User reviews billing', type: 'action' }],
        frontendStack: 'Next',
        backendStack: 'Node',
        dbChoice: 'pg',
        uiux: {
          screens: [
            { name: 'A', route: '/' },
            { name: 'B', route: '/b' },
            { name: 'C', route: '/c' },
          ],
        },
      },
    } as unknown as ProjectContext
    const r = crossCheck2(context)
    expect(r.passed).toBe(true)
  })

  it('crossCheck2: fails when frontendStack missing from systemDesign', () => {
    const context = {
      projectId: 'p',
      projectName: 'P',
      currentPhase: 2,
      phase2Output: {
        features: [{ name: 'Billing', priority: 'must', description: 'd' }],
        steps: [{ id: '1', label: 'User reviews billing', type: 'action' }],
        backendStack: 'Node',
        dbChoice: 'pg',
        uiux: { screens: [{ name: 'A', route: '/' }, { name: 'B', route: '/b' }] },
      },
    } as unknown as ProjectContext
    const r = crossCheck2(context)
    expect(r.passed).toBe(false)
    expect(r.issues.some((i) => i.includes('frontendStack'))).toBe(true)
  })

  it('crossCheck3A: auto-adds missing route file for uncovered feature', () => {
    const plan: FileSpec[] = [
      {
        path: '/src/services/billing.service.ts',
        description: 'Service for billing reconciliation',
        layer: 'service',
        batchNumber: 3,
        complexity: 'complex',
        estimatedLines: 100,
        dependencies: [],
      },
    ]
    const context = {
      phase2Output: {
        features: [{ name: 'Billing', priority: 'must', description: 'd' }],
      },
    } as unknown as ProjectContext
    const r = crossCheck3A(plan, context)
    expect(r.autoFixed).toBe(true)
    expect(r.fixedPlan.some((f) => f.layer === 'route')).toBe(true)
  })

  it('crossCheck3A: auto-adds entry point when missing', () => {
    const plan: FileSpec[] = [
      {
        path: '/src/lib/x.ts',
        description: 'util',
        layer: 'config',
        batchNumber: 2,
        complexity: 'simple',
        estimatedLines: 20,
        dependencies: [],
      },
    ]
    const r = crossCheck3A(plan, {} as ProjectContext)
    expect(r.fixedPlan.some((f) => f.path.endsWith('index.ts'))).toBe(true)
  })

  it('crossCheck3B: fails for file with TODO comment', () => {
    const r = crossCheck3B([{ path: 'a.ts', content: `${'a'.repeat(45)}// TODO fix this later` }])
    expect(r.passed).toBe(false)
  })

  it('crossCheck3B: fails for file < 50 chars', () => {
    const r = crossCheck3B([{ path: 'a.ts', content: 'x'.repeat(20) }])
    expect(r.passed).toBe(false)
  })

  it('crossCheck3C: fails when actual < 95% of expected', () => {
    const r = crossCheck3C(
      Array.from({ length: 90 }, (_, i) => ({
        path: `f${i}.ts`,
        content: 'x'.repeat(60),
      })),
      { totalFiles: 100 },
    )
    expect(r.passed).toBe(false)
  })

  it('crossCheck0: flags low file estimate vs must-have features', () => {
    const estimate = {
      totalFiles: 2,
      backendFiles: 1,
      frontendFiles: 1,
      tier: 'small' as const,
      architecture: 'single-repo' as const,
      estimatedMinutes: 1,
      estimatedBatches: 1,
    }
    const context = {
      phase2Output: {
        features: [
          { name: 'A', priority: 'must', description: 'd' },
          { name: 'B', priority: 'must', description: 'd' },
        ],
        frontendStack: 'Next',
        backendStack: 'Node',
      },
    } as unknown as ProjectContext
    const r = crossCheck0(context, estimate)
    expect(r.passed).toBe(false)
  })
})
