import { describe, expect, it } from 'vitest'

import type { FileSpec } from '../../../src/types/phase4.types.js'
import type { ProjectContext } from '@repo/types'

import {
  deriveORM,
  SchemaGeneratorAgent,
} from '../../../src/agents/phase4/schemaGenerator.agent.js'

describe('SchemaGeneratorAgent', () => {
  const baseFile: FileSpec = {
    path: '/src/db/schema.ts',
    description: 'Drizzle schema',
    layer: 'db',
    batchNumber: 1,
    complexity: 'complex',
    estimatedLines: 200,
    dependencies: [],
  }

  const baseContext = {
    projectId: 'p',
    projectName: 'Acme',
    currentPhase: 4,
    phase2Output: {
      systemDesign: {
        dbChoice: 'PostgreSQL',
        apiEndpoints: [{ method: 'GET', path: '/api/items' }],
      },
      prd: {
        features: [
          { name: 'Inventory', priority: 'must', description: 'Track stock' },
          { name: 'Nice', priority: 'should', description: 'x' },
        ],
      },
    },
  } as unknown as ProjectContext

  it('deriveORM(PostgreSQL) returns Drizzle ORM', () => {
    expect(deriveORM('PostgreSQL')).toBe('Drizzle ORM')
  })

  it('deriveORM(MongoDB) returns Mongoose', () => {
    expect(deriveORM('MongoDB')).toBe('Mongoose')
  })

  it('buildFilePrompt system contains dbChoice and ormChoice', () => {
    const agent = new SchemaGeneratorAgent()
    const { system } = agent.buildFilePrompt(baseFile, [], baseContext)
    expect(system).toContain('PostgreSQL')
    expect(system).toContain('Drizzle ORM')
  })

  it('buildFilePrompt includes mustHave feature names', () => {
    const agent = new SchemaGeneratorAgent()
    const { system } = agent.buildFilePrompt(baseFile, [], baseContext)
    expect(system).toContain('Inventory')
    expect(system).not.toContain('Nice')
  })

  it('buildFilePrompt includes priorFilesContent when non-empty', () => {
    const agent = new SchemaGeneratorAgent()
    const prior = [{ path: '/src/db/types.ts', content: 'export type X = 1' }]
    const { system } = agent.buildFilePrompt(baseFile, prior, baseContext)
    expect(system).toContain('Already generated in this batch')
    expect(system).toContain('/src/db/types.ts')
    expect(system).toContain('export type X = 1')
  })

  it('buildFilePrompt does NOT include priorFilesContent when empty', () => {
    const agent = new SchemaGeneratorAgent()
    const { system } = agent.buildFilePrompt(baseFile, [], baseContext)
    expect(system).toContain('This is the first file in the DB batch.')
    expect(system).not.toContain('Already generated in this batch')
  })
})
