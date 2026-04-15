import { BaseAgent } from '../base.agent.js'
import {
  buildModeConstraint,
  formatUserPreferencesLine,
  readBuildMode,
  readUserPreferences,
  phase1AsRecord,
  phase2AsRecord,
} from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
const ARCH = new Set(['single-repo', 'monorepo', 'microservices'])

function mustHaveNames(context: ProjectContext): string {
  const p2 = phase2AsRecord(context)
  const features = p2['features']
  if (!Array.isArray(features)) return '(none yet — infer from problem scope)'
  const names: string[] = []
  for (const f of features) {
    if (!f || typeof f !== 'object' || Array.isArray(f)) continue
    const row = f as Record<string, unknown>
    if (row['priority'] === 'must' && typeof row['name'] === 'string') names.push(row['name'])
  }
  return names.length ? names.map((n) => `- ${n}`).join('\n') : '(none yet — infer from problem scope)'
}

function icpTechLevel(context: ProjectContext): string {
  const p1 = phase1AsRecord(context)
  const icp = p1['icp']
  if (icp && typeof icp === 'object' && !Array.isArray(icp)) {
    const ts = (icp as Record<string, unknown>)['techSophistication']
    if (typeof ts === 'string' && ts.length) return ts
  }
  const prefs = readUserPreferences(context)
  const t = prefs['techSophistication']
  return typeof t === 'string' && t.length ? t : 'non-technical'
}

export class SystemDesignAgent extends BaseAgent {
  readonly agentType: AgentType = 'system_design'
  readonly phase = 2

  getAgentTask(): string {
    return 'Recommend tech stack and API structure for this product'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    void documentContent
    const mode = readBuildMode(context)
    const prefs = readUserPreferences(context)
    const scale = prefs['scale'] ?? 'AI decides'
    const archPref = prefs['architecture'] ?? 'AI decides'
    const deployment = prefs['deployment'] ?? 'AI decides'

    return `ROLE: Staff Engineer, fights over-engineering, opinionated.

CONTEXT:
Must-have features:
${mustHaveNames(context)}
ICP technical level: ${icpTechLevel(context)}
User preferences: scale=${String(scale)}, architecture=${String(archPref)}, deployment preference=${String(deployment)}
${formatUserPreferencesLine(prefs)}
Build mode: ${buildModeConstraint(mode)}

DECISION FRAMEWORK (follow verbatim):
"Features ≤5 AND services=1 → single-repo Node.js
Features 6-10 OR services=2-3 → organized single-repo
Features >10 OR services>3 → monorepo
Production AND services>4 → microservices
NEVER recommend microservices for MVP — always wrong
Default to PostgreSQL unless data is truly document-structured
Default to Next.js for frontend unless mobile-first"

CONSTRAINTS:
ONE recommendation per category. No "it depends". No alternatives.
frontendStack, backendStack, dbChoice must be specific with version.
deploymentPlan must name specific services (Vercel/Railway/Supabase etc.)
THIS OUTPUT DRIVES PHASE 4 CODE GENERATION — vague = broken code.
apiEndpoints[]: 5-8 entries based on must-have features.

OUTPUT SCHEMA:
{ "frontendStack","frontendRationale","backendStack","backendRationale",
  "dbChoice","dbRationale","authStrategy","authRationale",
  "deploymentPlan":{ "frontend","backend","database" },
  "apiEndpoints":[{ "method","path","description","auth":boolean }],
  "estimatedMonthlyCost","scalabilityNote",
  "architecture":"single-repo"|"monorepo"|"microservices" }`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const parsed = this.safeJsonParse(rawText)
    const base: Record<string, unknown> = parsed.data && parsed.success ? { ...parsed.data } : {}

    const fe =
      typeof base['frontendStack'] === 'string' && base['frontendStack'].trim().length > 0
        ? base['frontendStack']
        : 'Next.js 15'
    const be =
      typeof base['backendStack'] === 'string' && base['backendStack'].trim().length > 0
        ? base['backendStack']
        : 'Node.js + Hono'
    const db =
      typeof base['dbChoice'] === 'string' && base['dbChoice'].trim().length > 0
        ? base['dbChoice']
        : 'PostgreSQL'
    base['frontendStack'] = fe
    base['backendStack'] = be
    base['dbChoice'] = db

    let arch = typeof base['architecture'] === 'string' ? base['architecture'] : 'single-repo'
    if (!ARCH.has(arch)) arch = 'single-repo'
    base['architecture'] = arch

    let endpoints = base['apiEndpoints']
    if (!Array.isArray(endpoints)) endpoints = []
    const epList: Array<Record<string, unknown>> = []
    for (const e of endpoints as unknown[]) {
      if (!e || typeof e !== 'object' || Array.isArray(e)) continue
      const row = { ...(e as Record<string, unknown>) }
      let m = typeof row['method'] === 'string' ? row['method'].toUpperCase() : 'GET'
      if (!HTTP_METHODS.has(m)) m = 'GET'
      row['method'] = m
      row['auth'] = Boolean(row['auth'])
      epList.push(row)
    }
    base['apiEndpoints'] = epList

    return { data: base, success: parsed.success }
  }
}
