import { BaseAgent } from '../base.agent.js'

import type { FileSpec } from '../../types/phase4.types.js'
import type { AgentType, ProjectContext } from '@repo/types'

function phase2Root(context: ProjectContext): Record<string, unknown> {
  const p = context.phase2Output as unknown
  return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {}
}

function systemDesign(context: ProjectContext): Record<string, unknown> {
  const p2 = phase2Root(context)
  const sd = p2['systemDesign']
  if (sd && typeof sd === 'object' && !Array.isArray(sd)) return sd as Record<string, unknown>
  return p2
}

function apiEndpointsFull(
  context: ProjectContext,
): Array<{ method: string; path: string; description: string }> {
  const sd = systemDesign(context)
  const raw = sd['apiEndpoints'] ?? phase2Root(context)['apiEndpoints']
  if (!Array.isArray(raw)) return []
  const out: Array<{ method: string; path: string; description: string }> = []
  for (const e of raw) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue
    const row = e as Record<string, unknown>
    out.push({
      method: String(row['method'] ?? 'GET'),
      path: String(row['path'] ?? ''),
      description: String(row['description'] ?? ''),
    })
  }
  return out
}

function routeFileToken(file: FileSpec): string {
  return file.path.split('/').pop()?.replace(/\.routes\.ts$/i, '') ?? ''
}

export class ApiGeneratorAgent extends BaseAgent {
  readonly agentType: AgentType = 'api_generator'
  readonly phase = 4

  getAgentTask(): string {
    return 'Define REST API routes for all PRD features'
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
    const sd = systemDesign(context)
    const backendStack =
      typeof sd['backendStack'] === 'string' && sd['backendStack'].trim().length > 0
        ? String(sd['backendStack'])
        : 'Node.js + Hono'
    const apiEndpoints = apiEndpointsFull(context)
    const fileToken = routeFileToken(file)
    const relevantEndpoints = apiEndpoints.filter(
      (e) => fileToken.length > 0 && e.path.includes(fileToken),
    )

    const endpointsBlock =
      relevantEndpoints.length > 0
        ? relevantEndpoints.map((e) => `${e.method} ${e.path} — ${e.description}`).join('\n')
        : 'Infer endpoints from file name and project context'

    const depsBlock =
      priorFilesContent.length > 0
        ? priorFilesContent
            .map(
              (f) => `=== ${f.path} (first 400 chars) ===
${f.content.substring(0, 400)}`,
            )
            .join('\n')
        : '(no dependency files loaded yet)'

    const system = `[ROLE]
You are a senior backend engineer writing ${backendStack} route files.
Route files contain ONLY routing logic — no business logic, no DB calls.
All business logic belongs in service files.

[CONTEXT]
Project: ${context.projectName}
Framework: ${backendStack}
File to generate: ${file.path}
Purpose: ${file.description}

API endpoints this file must implement:
${endpointsBlock}

Dependencies available:
${depsBlock}

[CONSTRAINTS]
Generate ONLY ${file.path}
- Routes import from service files. Never query DB directly.
- Each route: validate input, call service, return response.
- Use appropriate HTTP status codes (201 for create, 204 for delete, etc.)
- No console.log statements.
- Return raw TypeScript/JavaScript. No markdown. No \`\`\` wrapper.
  Start with the first import. End with the last line. Nothing else.`

    const user = `Generate the complete route file: ${file.path}
${file.description}
Generate the full file. No placeholders. No TODOs.`

    return { system, user }
  }
}
