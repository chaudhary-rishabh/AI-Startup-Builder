import { BaseAgent } from '../base.agent.js'
import { phase2AsRecord } from '../prompt.helpers.js'

import type { FileSpec } from '../../types/phase4.types.js'
import type { AgentType, ProjectContext } from '@repo/types'

type PrdFeatureRow = {
  name: string
  priority?: string
  acceptanceCriteria: string[]
}

function systemDesignRecord(context: ProjectContext): Record<string, unknown> {
  const p2 = phase2AsRecord(context)
  const nested = p2['systemDesign']
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  return p2
}

function backendStackFromContext(context: ProjectContext): string {
  const sd = systemDesignRecord(context)
  const fromSd = sd['backendStack']
  if (typeof fromSd === 'string' && fromSd.trim().length > 0) return fromSd.trim()
  const p2 = phase2AsRecord(context)
  const flat = p2['backendStack']
  if (typeof flat === 'string' && flat.trim().length > 0) return flat.trim()
  return 'Node.js'
}

function prdMustHaveFeatures(context: ProjectContext): PrdFeatureRow[] {
  const p2 = phase2AsRecord(context)
  const prd = p2['prd']
  const raw =
    prd && typeof prd === 'object' && !Array.isArray(prd)
      ? (prd as Record<string, unknown>)['features']
      : p2['features']
  if (!Array.isArray(raw)) return []
  const out: PrdFeatureRow[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const r = row as Record<string, unknown>
    const name = typeof r['name'] === 'string' ? r['name'] : ''
    const priority = typeof r['priority'] === 'string' ? r['priority'] : ''
    const ac = r['acceptanceCriteria']
    const acceptanceCriteria = Array.isArray(ac)
      ? ac.filter((x): x is string => typeof x === 'string')
      : []
    out.push({ name, priority, acceptanceCriteria })
  }
  return out.filter((f) => f.priority === 'must')
}

function relevantAcceptanceCriteria(
  file: FileSpec,
  priorFilesContent: Array<{ path: string; content: string }>,
  mustHave: PrdFeatureRow[],
): string[] {
  return mustHave
    .filter((f) => {
      const token = f.name.toLowerCase().split(/\s+/)[0] ?? ''
      if (!token) return false
      const pathHit = file.path.toLowerCase().includes(token)
      const priorHit = priorFilesContent.some((p) => p.path.toLowerCase().includes(token))
      return pathHit || priorHit
    })
    .flatMap((f) => f.acceptanceCriteria)
}

export class BackendAgent extends BaseAgent {
  readonly agentType: AgentType = 'backend'
  readonly phase = 4

  getAgentTask(): string {
    return 'Generate backend business logic for all PRD features'
  }

  buildSystemPrompt(_context: ProjectContext, _documentContent: string): string {
    return ''
  }

  parseOutput(_rawText: string): { data: Record<string, unknown>; success: boolean } {
    return { data: {}, success: false }
  }

  buildFilePrompt(
    file: FileSpec,
    priorFilesContent: Array<{ path: string; content: string }>,
    context: ProjectContext,
  ): { system: string; user: string } {
    const backendStack = backendStackFromContext(context)
    const mustHave = prdMustHaveFeatures(context)
    const relevantCriteria = relevantAcceptanceCriteria(file, priorFilesContent, mustHave)

    const criteriaBlock =
      relevantCriteria.length > 0
        ? relevantCriteria.join('\n')
        : 'Implement standard CRUD operations for this domain'

    const depsBlock =
      priorFilesContent.length > 0
        ? priorFilesContent.map((f) => `=== ${f.path} ===\n${f.content}`).join('\n')
        : '(no dependency files loaded for this file)'

    const system = `[ROLE]
You are a senior backend engineer writing ${backendStack} service layer code.
Services contain ALL business logic. They accept plain data and return plain data.
They never access request or response objects directly.
They throw typed errors with meaningful messages.
They use async/await. No callbacks. No promise chains.

[CONTEXT]
Project: ${context.projectName}
Stack: ${backendStack}
File to generate: ${file.path}
Purpose: ${file.description}

Business logic requirements (from PRD acceptance criteria):
${criteriaBlock}

Dependencies (read these to understand what is available):
${depsBlock}
← Only the files this file directly imports from are shown above.

[CONSTRAINTS]
Generate ONLY ${file.path}
- Services: accept plain data, return plain data. No req/res objects.
- Throw AppError from lib/errors.ts (not generic Error).
- No console.log — use logger from lib/logger.ts.
- Every async function has try/catch.
- Every function has full TypeScript parameter and return types.
- Return raw TypeScript. No markdown. No \`\`\` wrapper.
  Start with first import. End with last line. Nothing else.`

    const user = `Generate the complete ${file.layer} file: ${file.path}
${file.description}
All functions implemented. No TODOs. No placeholders.`

    return { system, user }
  }
}
