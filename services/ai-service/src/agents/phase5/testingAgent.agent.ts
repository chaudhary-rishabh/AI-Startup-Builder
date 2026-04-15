import { BaseAgent } from '../base.agent.js'
import { phase2AsRecord } from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

function readBackendStack(p2: Record<string, unknown>): string {
  const sd =
    p2['systemDesign'] && typeof p2['systemDesign'] === 'object' && !Array.isArray(p2['systemDesign'])
      ? (p2['systemDesign'] as Record<string, unknown>)
      : undefined
  const v = sd?.['backendStack'] ?? p2['backendStack']
  return typeof v === 'string' && v.length > 0 ? v : 'Node.js'
}

function readMustHaveNames(p2: Record<string, unknown>): string[] {
  const prd =
    p2['prd'] && typeof p2['prd'] === 'object' && !Array.isArray(p2['prd'])
      ? (p2['prd'] as Record<string, unknown>)
      : undefined
  const raw = (prd?.['features'] ?? p2['features']) as unknown
  if (!Array.isArray(raw)) return []
  const names: string[] = []
  for (const f of raw) {
    if (!f || typeof f !== 'object' || Array.isArray(f)) continue
    const row = f as Record<string, unknown>
    if (row['priority'] === 'must' && typeof row['name'] === 'string') names.push(row['name'])
  }
  return names
}

export class TestingAgent extends BaseAgent {
  readonly agentType: AgentType = 'testing'
  readonly phase = 5

  getAgentTask(): string {
    return 'Generate Vitest unit and integration tests for core service logic'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    void documentContent
    const p2 = phase2AsRecord(context)
    const backendStack = readBackendStack(p2)
    const mustHave = readMustHaveNames(p2)

    return `[ROLE]
You are a QA engineer who writes tests that catch real bugs, not just tests that pass CI. You believe test code is production code.

[CONTEXT]
Project: ${context.projectName}
Backend stack: ${backendStack}

Must-have features requiring test coverage:
${mustHave.length ? mustHave.map((n) => `- ${n}`).join('\n') : '- (none specified)'}

[TASK]
Generate a test plan and test file stubs for the core service logic in this project. Return JSON with files array.

[CONSTRAINTS]
- Return ONLY valid JSON: { "files": [{ "path", "content" }] }
- Use Vitest syntax (vi.mock, describe, it, expect).
- Each service file gets its own test file.
- Each test file: 1 happy path + 2 error cases minimum per function.
- Mock DB calls with vi.mock. Do not make real DB calls in tests.
- Test behavior, not implementation. No snapshot tests.
- file content: raw TypeScript, no markdown, starts with first import.
- Return JSON only. No explanation. No preamble.`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const parsed = this.safeJsonParse(rawText)
    const base: Record<string, unknown> = parsed.data && parsed.success ? { ...parsed.data } : {}
    let files = base['files']
    if (!Array.isArray(files)) files = []
    base['files'] = files
    return { data: base, success: parsed.success }
  }
}
