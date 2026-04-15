import { describe, expect, it } from 'vitest'

import type { ProjectContext } from '@repo/types'

import { estimateProjectSize } from '../../src/services/estimateProjectSize.service.js'

function ctx(partial: Partial<ProjectContext> & { phase2Output?: Record<string, unknown> }): ProjectContext {
  return {
    projectId: 'p',
    projectName: 'P',
    currentPhase: 2,
    ...partial,
  } as ProjectContext
}

describe('estimateProjectSize', () => {
  it("returns 'small' tier for 3 must features, MVP, and one Phase 3 screen", () => {
    const c = ctx({
      phase2Output: {
        features: [
          { name: 'A', priority: 'must', description: 'd' },
          { name: 'B', priority: 'must', description: 'd' },
          { name: 'C', priority: 'must', description: 'd' },
        ],
        architecture: 'single-repo',
        frontendStack: 'Next',
        backendStack: 'Node',
        dbChoice: 'pg',
      },
      phase3Output: { screens: [{ screenName: 'One', route: '/' }] } as never,
    })
    const e = estimateProjectSize(c)
    expect(e.tier).toBe('small')
    expect(e.totalFiles).toBe(24)
  })

  it("returns 'standard' tier for 8 must features, production, 6 screens", () => {
    const features = Array.from({ length: 8 }, (_, i) => ({
      name: `F${i}`,
      priority: 'must' as const,
      description: 'x',
    }))
    const screens = Array.from({ length: 6 }, (_, i) => ({
      screenName: `S${i}`,
      route: `/${i}`,
    }))
    const c = ctx({
      phase2Output: {
        features,
        architecture: 'single-repo',
        frontendStack: 'Next',
        backendStack: 'Node',
        dbChoice: 'pg',
      },
      phase3Output: { screens } as never,
      project: { userPreferences: { scale: 'production' } },
    } as ProjectContext)
    const e = estimateProjectSize(c)
    expect(e.tier).toBe('standard')
    expect(e.totalFiles).toBe(65)
  })

  it("returns 'large' tier for 12 must + production + 8 screens with auth and payments", () => {
    const features = Array.from({ length: 12 }, (_, i) => ({
      name: i === 0 ? 'User login portal' : i === 1 ? 'Stripe billing' : `F${i}`,
      priority: 'must' as const,
      description: 'x',
    }))
    const screens = Array.from({ length: 8 }, (_, i) => ({
      screenName: `S${i}`,
      route: `/${i}`,
    }))
    const c = ctx({
      phase2Output: {
        features,
        architecture: 'single-repo',
        frontendStack: 'Next',
        backendStack: 'Node',
        dbChoice: 'pg',
      },
      phase3Output: { screens } as never,
      project: { userPreferences: { scale: 'production' } },
    } as ProjectContext)
    const e = estimateProjectSize(c)
    expect(e.tier).toBe('large')
    expect(e.totalFiles).toBe(88)
  })

  it('estimatedMinutes = Math.ceil(totalFiles * 0.4)', () => {
    const c = ctx({
      phase2Output: {
        features: [{ name: 'One', priority: 'must', description: 'd' }],
        architecture: 'single-repo',
        frontendStack: 'Next',
        backendStack: 'Node',
        dbChoice: 'pg',
      },
      phase3Output: { screens: [] } as never,
    })
    const e = estimateProjectSize(c)
    expect(e.estimatedMinutes).toBe(Math.ceil(e.totalFiles * 0.4))
    expect(e.estimatedBatches).toBe(Math.ceil(e.totalFiles / 7))
  })

  it('hasAuth flag increases backendTotal by 2', () => {
    const base = {
      features: [{ name: 'Widgets', priority: 'must' as const, description: 'd' }],
      architecture: 'single-repo' as const,
      frontendStack: 'Next',
      backendStack: 'Node',
      dbChoice: 'pg',
    }
    const without = estimateProjectSize(
      ctx({ phase2Output: { ...base }, phase3Output: { screens: [{ screenName: 'A', route: '/' }] } as never }),
    )
    const withAuth = estimateProjectSize(
      ctx({
        phase2Output: {
          ...base,
          features: [{ name: 'User authentication', priority: 'must' as const, description: 'd' }],
        },
        phase3Output: { screens: [{ screenName: 'A', route: '/' }] } as never,
      }),
    )
    expect(withAuth.backendFiles - without.backendFiles).toBe(2)
  })
})
