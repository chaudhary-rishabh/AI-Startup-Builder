import { describe, expect, it } from 'vitest'

import type { FileSpec } from '../../../src/types/phase4.types.js'
import type { ProjectContext } from '@repo/types'

import { BackendAgent } from '../../../src/agents/phase4/backendAgent.agent.js'

describe('BackendAgent', () => {
  const baseContext = {
    projectId: 'p',
    projectName: 'Acme',
    currentPhase: 4,
    phase2Output: {
      systemDesign: { backendStack: 'Node.js + Hono' },
      prd: {
        features: [
          {
            name: 'User Profiles',
            priority: 'must',
            acceptanceCriteria: ['Given a profile, When saved, Then it persists'],
          },
          {
            name: 'Billing Export',
            priority: 'must',
            acceptanceCriteria: ['Given billing, When export, Then CSV downloads'],
          },
          { name: 'Nice to have', priority: 'should', acceptanceCriteria: ['Should not appear'] },
        ],
      },
    },
  } as unknown as ProjectContext

  it('buildFilePrompt includes full dependency file contents', () => {
    const agent = new BackendAgent()
    const file: FileSpec = {
      path: 'src/services/user.service.ts',
      description: 'User service',
      layer: 'service',
      batchNumber: 2,
      complexity: 'medium',
      estimatedLines: 120,
      dependencies: ['src/lib/db.ts'],
    }
    const prior = [{ path: 'src/lib/db.ts', content: 'export const db = {}\n'.repeat(50) }]
    const { system } = agent.buildFilePrompt(file, prior, baseContext)
    expect(system).toContain('=== src/lib/db.ts ===')
    expect(system).toContain(prior[0]!.content)
  })

  it('buildFilePrompt filters relevant acceptance criteria by feature name token', () => {
    const agent = new BackendAgent()
    const file: FileSpec = {
      path: 'src/services/billing.service.ts',
      description: 'Billing',
      layer: 'service',
      batchNumber: 2,
      complexity: 'medium',
      estimatedLines: 120,
      dependencies: [],
    }
    const prior = [{ path: 'src/routes/health.routes.ts', content: '// health route' }]
    const { system } = agent.buildFilePrompt(file, prior, baseContext)
    expect(system).toContain('Given billing, When export, Then CSV downloads')
    expect(system).not.toContain('Given a profile, When saved, Then it persists')
  })

  it('buildFilePrompt GOLDEN CONSTRAINT is present in system prompt', () => {
    const agent = new BackendAgent()
    const file: FileSpec = {
      path: 'src/services/x.service.ts',
      description: 'X',
      layer: 'service',
      batchNumber: 1,
      complexity: 'simple',
      estimatedLines: 40,
      dependencies: [],
    }
    const { system } = agent.buildFilePrompt(file, [], baseContext)
    expect(system).toContain('- Throw AppError from lib/errors.ts (not generic Error).')
    expect(system).toContain('- Return raw TypeScript. No markdown. No ``` wrapper.')
  })
})
