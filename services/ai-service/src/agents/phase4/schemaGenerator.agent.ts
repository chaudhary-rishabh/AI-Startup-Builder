import { BaseAgent } from '../base.agent.js'

import type { FileSpec } from '../../types/phase4.types.js'
import type { AgentType, ProjectContext } from '@repo/types'

export function deriveORM(dbChoice: string): string {
  const d = dbChoice.trim()
  if (d === 'MongoDB') return 'Mongoose'
  if (d === 'PostgreSQL' || d === 'Supabase') return 'Drizzle ORM'
  return 'Drizzle ORM'
}

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

function mustFeatures(context: ProjectContext): Array<{ name: string; description: string }> {
  const p2 = phase2Root(context)
  const prd = p2['prd']
  let features: unknown = p2['features']
  if (prd && typeof prd === 'object' && !Array.isArray(prd)) {
    const nested = (prd as Record<string, unknown>)['features']
    if (Array.isArray(nested)) features = nested
  }
  if (!Array.isArray(features)) return []
  const out: Array<{ name: string; description: string }> = []
  for (const f of features) {
    if (!f || typeof f !== 'object' || Array.isArray(f)) continue
    const row = f as Record<string, unknown>
    if (String(row['priority'] ?? '').toLowerCase() !== 'must') continue
    out.push({
      name: String(row['name'] ?? ''),
      description: String(row['description'] ?? ''),
    })
  }
  return out
}

function apiEndpointsList(context: ProjectContext): Array<{ method: string; path: string }> {
  const sd = systemDesign(context)
  const raw = sd['apiEndpoints'] ?? phase2Root(context)['apiEndpoints']
  if (!Array.isArray(raw)) return []
  const out: Array<{ method: string; path: string }> = []
  for (const e of raw) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue
    const row = e as Record<string, unknown>
    out.push({
      method: String(row['method'] ?? 'GET'),
      path: String(row['path'] ?? ''),
    })
  }
  return out
}

export class SchemaGeneratorAgent extends BaseAgent {
  readonly agentType: AgentType = 'schema_generator'
  readonly phase = 4

  getAgentTask(): string {
    return 'Generate database schema for all PRD entities'
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
    const dbChoice =
      typeof sd['dbChoice'] === 'string' && sd['dbChoice'].trim().length > 0
        ? String(sd['dbChoice'])
        : 'PostgreSQL'
    const ormChoice = deriveORM(dbChoice)
    const mustHave = mustFeatures(context)
    const apiEndpoints = apiEndpointsList(context)

    const priorBlock =
      priorFilesContent.length > 0
        ? `
    Already generated in this batch (do not duplicate):
    ${priorFilesContent.map((f) => `=== ${f.path} ===\n${f.content}`).join('\n')}
    `
        : 'This is the first file in the DB batch.'

    const system = `[ROLE]
You are a database architect specializing in ${dbChoice} schemas for
production SaaS applications. You write schemas that are normalized,
performant, and immediately usable by service layer code.

[CONTEXT]
Project: ${context.projectName}
Database: ${dbChoice}
ORM: ${ormChoice}
File to generate: ${file.path}
File purpose: ${file.description}

Must-have features (entities these tables support):
${mustHave.map((f) => `- ${f.name}: ${f.description}`).join('\n')}

Query patterns to optimize for (drives index decisions):
${apiEndpoints.map((e) => `${e.method} ${e.path}`).join('\n')}

${priorBlock}

[CONSTRAINTS]
Generate ONLY the file: ${file.path}
- snake_case column names, camelCase TypeScript exports
- UUID primary keys (gen_random_uuid() or cuid())
- soft deletes: deleted_at column on user-owned entities
- created_at and updated_at on every table
- Export all TypeScript types that service layer will need
- Add brief JSDoc comment per table (one line)
- Return raw TypeScript code. No markdown. No \`\`\` wrapper.
  Start with the first import. End with the last line. Nothing else.`

    const user = `Generate the complete content for: ${file.path}
${file.description}

Dependencies already available:
${file.dependencies.length > 0 ? file.dependencies.join(', ') : 'None'}

Generate the full production-ready file now. No placeholders.`

    return { system, user }
  }
}
