import { describe, expect, it } from 'vitest'

import { IntegrationAgent } from '../../../src/agents/phase4/integrationAgent.agent.js'

describe('IntegrationAgent', () => {
  it('buildAuditPrompt includes all keyFiles contents', () => {
    const agent = new IntegrationAgent()
    const keyFiles = {
      'index.ts': 'export const app = 1',
      'lib/api.ts': 'export async function get() {}',
      'middleware/auth': '// auth mw',
      'routes/auth': '// auth routes',
      'layout.tsx': 'export default function Root() {}',
      '.env.example': 'API_URL=',
    }
    const { system } = agent.buildAuditPrompt(keyFiles)
    expect(system).toContain('=== index.ts ===\nexport const app = 1')
    expect(system).toContain('=== lib/api.ts ===')
    expect(system).toContain('=== .env.example ===')
  })

  it('buildAuditPrompt asks for JSON array only', () => {
    const agent = new IntegrationAgent()
    const { system, user } = agent.buildAuditPrompt({ 'index.ts': 'x' })
    expect(system).toContain('Return ONLY a JSON array of issues')
    expect(user).toContain('Return JSON array only')
  })

  it('buildPatchPrompt includes currentFileContent', () => {
    const agent = new IntegrationAgent()
    const body = 'line1\nline2\n'
    const { system } = agent.buildPatchPrompt(body, {
      file: 'src/index.ts',
      issue: 'broken import',
      fix: "change import to './lib'",
    })
    expect(system).toContain('Current file content:')
    expect(system).toContain(body)
  })

  it('buildPatchPrompt includes specific fix instruction', () => {
    const agent = new IntegrationAgent()
    const { system, user } = agent.buildPatchPrompt('const x = 1', {
      file: 'app/layout.tsx',
      issue: 'Layout missing provider',
      fix: 'Wrap children in <Provider>',
    })
    expect(system).toContain('Fix to apply: Wrap children in <Provider>')
    expect(user).toContain('Wrap children in <Provider>')
    expect(user).toContain('app/layout.tsx')
  })

  it('parseOutput (audit): filters to only valid issue shapes', () => {
    const agent = new IntegrationAgent()
    const raw = JSON.stringify([
      { file: 'a.ts', issue: 'x', severity: 'blocking', fix: 'do y' },
      { file: 'bad', issue: 1, severity: 'blocking', fix: 'z' },
      { oops: true },
    ])
    const out = agent.parseOutput(raw)
    expect(out.success).toBe(true)
    const issues = (out.data as { issues: unknown[] }).issues
    expect(issues).toHaveLength(1)
    expect(issues[0]).toEqual({
      file: 'a.ts',
      issue: 'x',
      severity: 'blocking',
      fix: 'do y',
    })
  })

  it('parseOutput (audit): returns empty array on malformed JSON', () => {
    const agent = new IntegrationAgent()
    const out = agent.parseOutput('not json at all')
    expect(out.success).toBe(false)
    expect((out.data as { issues: unknown[] }).issues).toEqual([])
  })
})
