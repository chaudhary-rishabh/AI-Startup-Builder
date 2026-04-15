import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as generationPlans from '../../../src/db/queries/generationPlans.queries.js'
import { SkeletonAgent } from '../../../src/agents/phase4/skeletonAgent.agent.js'

import type { ProjectContext } from '@repo/types'

vi.mock('../../../src/db/queries/generationPlans.queries.js', () => ({
  deletePlansByProjectId: vi.fn(),
  createGenerationPlan: vi.fn(),
}))

describe('SkeletonAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(generationPlans.deletePlansByProjectId).mockResolvedValue(undefined)
    vi.mocked(generationPlans.createGenerationPlan).mockResolvedValue({} as never)
  })

  it('parseOutput accepts a raw JSON array', () => {
    const agent = new SkeletonAgent()
    const raw = JSON.stringify([
      {
        path: '/src/db/schema.ts',
        description: 'Drizzle schema',
        layer: 'db',
        batchNumber: 1,
        complexity: 'complex',
        estimatedLines: 200,
        dependencies: [],
      },
    ])
    const out = agent.parseOutput(raw)
    expect(out.success).toBe(true)
    const files = out.data['files'] as unknown[]
    expect(Array.isArray(files)).toBe(true)
    expect((files as { path: string }[])[0]?.path).toBe('/src/db/schema.ts')
  })

  it('parseOutput accepts object with files array', () => {
    const agent = new SkeletonAgent()
    const raw = JSON.stringify({
      files: [
        {
          path: '/x.ts',
          description: 'x',
          layer: 'misc',
          batchNumber: 2,
          complexity: 'medium',
          estimatedLines: 40,
          dependencies: [],
        },
      ],
    })
    const out = agent.parseOutput(raw)
    expect(out.success).toBe(true)
  })

  it('savePlan writes generation plan', async () => {
    const agent = new SkeletonAgent()
    const ctx = {
      projectId: 'p',
      projectName: 'P',
      currentPhase: 2,
      phase2Output: { architecture: 'monorepo' },
    } as unknown as ProjectContext
    await agent.savePlan('proj-1', [], ctx)
    expect(generationPlans.deletePlansByProjectId).toHaveBeenCalledWith('proj-1')
    expect(generationPlans.createGenerationPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-1',
        tier: 'small',
        totalFiles: 0,
        totalBatches: 1,
        architecture: 'monorepo',
      }),
    )
  })

  it('getAgentTask returns planning instruction', () => {
    const agent = new SkeletonAgent()
    expect(agent.getAgentTask()).toContain('file structure')
  })

  it('buildSystemPrompt includes project name and constraints', () => {
    const agent = new SkeletonAgent()
    const prompt = agent.buildSystemPrompt(
      {
        projectId: 'p',
        projectName: 'Acme SaaS',
        currentPhase: 2,
        phase2Output: {
          features: [{ name: 'Auth', priority: 'must', description: 'Login' }],
          steps: [{ id: '1', label: 'User completes auth', type: 'action' }],
          frontendStack: 'Next.js',
          backendStack: 'Hono',
          dbChoice: 'PostgreSQL',
          authPlan: 'JWT',
          architecture: 'single-repo',
          apiEndpoints: [{ method: 'POST', path: '/api/login', description: 'Login' }],
        },
        phase3Output: { screens: [{ screenName: 'Dashboard', route: '/dashboard' }] },
      } as unknown as ProjectContext,
      '',
    )
    expect(prompt).toContain('Acme SaaS')
    expect(prompt).toContain('JWT')
    expect(prompt).toContain('Dashboard')
  })
})
