import { describe, expect, it } from 'vitest'

import type { FileSpec } from '../../../src/types/phase4.types.js'
import type { ProjectContext } from '@repo/types'

import { ApiGeneratorAgent } from '../../../src/agents/phase4/apiGenerator.agent.js'

describe('ApiGeneratorAgent', () => {
  const context = {
    projectId: 'p',
    projectName: 'Acme',
    currentPhase: 4,
    phase2Output: {
      systemDesign: {
        backendStack: 'Node.js + Hono',
        apiEndpoints: [
          { method: 'GET', path: '/api/users', description: 'List users' },
          { method: 'POST', path: '/api/posts', description: 'Create post' },
        ],
      },
    },
  } as unknown as ProjectContext

  it('buildFilePrompt filters relevant endpoints by file path name', () => {
    const agent = new ApiGeneratorAgent()
    const file: FileSpec = {
      path: '/src/routes/users.routes.ts',
      description: 'User HTTP routes',
      layer: 'route',
      batchNumber: 3,
      complexity: 'medium',
      estimatedLines: 80,
      dependencies: [],
    }
    const { system } = agent.buildFilePrompt(file, [], context)
    expect(system).toContain('/api/users')
    expect(system).not.toContain('/api/posts')
  })

  it('buildFilePrompt includes service file imports in context', () => {
    const agent = new ApiGeneratorAgent()
    const file: FileSpec = {
      path: '/src/routes/users.routes.ts',
      description: 'User routes',
      layer: 'route',
      batchNumber: 3,
      complexity: 'medium',
      estimatedLines: 80,
      dependencies: ['src/services/user.service.ts'],
    }
    const prior = [
      {
        path: 'src/services/user.service.ts',
        content: 'export const userService = { findAll: async () => [] as const }\n'.repeat(20),
      },
    ]
    const { system } = agent.buildFilePrompt(file, prior, context)
    expect(system).toContain('src/services/user.service.ts')
    expect(system).toContain('(first 400 chars)')
  })
})
