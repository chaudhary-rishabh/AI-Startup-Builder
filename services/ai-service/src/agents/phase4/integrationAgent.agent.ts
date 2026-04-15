import { BaseAgent } from '../base.agent.js'

import type { AgentType, ProjectContext } from '@repo/types'

export type IntegrationIssueSeverity = 'blocking' | 'warning'

export type IntegrationIssue = {
  file: string
  issue: string
  severity: IntegrationIssueSeverity
  fix: string
}

export type IntegrationCallType = 'audit' | 'patch'

function isIntegrationIssue(row: unknown): row is IntegrationIssue {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false
  const r = row as Record<string, unknown>
  return (
    typeof r['file'] === 'string' &&
    typeof r['issue'] === 'string' &&
    (r['severity'] === 'blocking' || r['severity'] === 'warning') &&
    typeof r['fix'] === 'string'
  )
}

export function resolveIntegrationCallType(input: {
  userMessage?: string
  integrationCallType?: IntegrationCallType
}): IntegrationCallType {
  if (input.integrationCallType === 'audit' || input.integrationCallType === 'patch') {
    return input.integrationCallType
  }
  const msg = input.userMessage?.toLowerCase() ?? ''
  if (msg.includes('integration_call:patch') || msg.includes('call type: patch')) {
    return 'patch'
  }
  return 'audit'
}

export class IntegrationAgent extends BaseAgent {
  readonly agentType: AgentType = 'integration'
  readonly phase = 4

  getAgentTask(): string {
    return 'Fix wiring issues between frontend and backend'
  }

  buildSystemPrompt(_context: ProjectContext, _documentContent: string): string {
    return ''
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const audit = this.parseAuditOutput(rawText)
    return {
      data: audit.data as Record<string, unknown>,
      success: audit.success,
    }
  }

  buildAuditPrompt(keyFiles: Record<string, string>): { system: string; user: string } {
    const filesBlock = Object.entries(keyFiles)
      .map(([path, content]) => `=== ${path} ===\n${content}`)
      .join('\n\n')

    const system = `[ROLE]
You are a precise integration auditor. Your ONLY job is to find broken
wiring between frontend and backend. You are NOT doing a code review.
You are NOT improving code quality. You are finding what breaks at runtime.

[CONTEXT]
Files to audit:
${filesBlock}

[CONSTRAINTS]
Return ONLY a JSON array of issues. No prose outside JSON.
Max 10 issues total. Pick the 10 most severe if you find more.
Each issue:
{ file: string, issue: string,
  severity: 'blocking' | 'warning',
  fix: string }
blocking = app will not run without this fix
warning = app runs but has incorrect behavior
fix = the EXACT code change (not a vague instruction)
Return [] if no issues found.`

    const user = `Audit the integration between frontend and backend.
Find all issues that prevent the app from running correctly.
Return JSON array only.`

    return { system, user }
  }

  buildPatchPrompt(
    currentFileContent: string,
    issue: { file: string; issue: string; fix: string },
  ): { system: string; user: string } {
    const system = `[ROLE]
You are a precise code editor. You apply ONE fix to ONE file.
You change ONLY what is required. Nothing else.

[CONTEXT]
Current file content:
${currentFileContent}

Issue to fix: ${issue.issue}
Fix to apply: ${issue.fix}

[CONSTRAINTS]
Return the COMPLETE updated file content. Not a diff. The full file.
Change ONLY what the fix requires.
No reformatting. No added comments. No style changes.
Return raw code. Start with the first line of the file.`

    const user = `Apply this fix to ${issue.file}:
${issue.fix}
Return the complete updated file.`

    return { system, user }
  }

  parseAuditOutput(rawText: string): { data: { issues: IntegrationIssue[] }; success: boolean } {
    const parsed = this.safeJsonParse(rawText)
    if (!parsed.success || parsed.data === null) {
      return { data: { issues: [] }, success: false }
    }
    const root = parsed.data
    const arr = Array.isArray(root) ? root : root['issues']
    if (!Array.isArray(arr)) {
      return { data: { issues: [] }, success: false }
    }
    const filtered = arr.filter(isIntegrationIssue).slice(0, 10)
    return { data: { issues: filtered }, success: true }
  }

  parsePatchOutput(rawText: string): { data: { updatedContent: string }; success: boolean } {
    return { data: { updatedContent: rawText.trim() }, success: true }
  }
}
