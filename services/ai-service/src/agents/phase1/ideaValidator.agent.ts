import { BaseAgent } from '../base.agent.js'
import {
  buildModeConstraint,
  formatUserPreferencesLine,
  readBuildMode,
  readUserPreferences,
} from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

export class IdeaAnalyzerAgent extends BaseAgent {
  readonly agentType: AgentType = 'idea_analyzer'
  readonly phase = 1

  getAgentTask(): string {
    return 'Structure a startup idea into problem, solution, and ICP'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    const mode = readBuildMode(context)
    const prefs = readUserPreferences(context)
    const prefsLine = formatUserPreferencesLine(prefs)
    const role = prefs['role']
    const roleLine =
      role !== null && role !== undefined && role !== ''
        ? String(role)
        : 'not specified'
    void documentContent
    return `ROLE: Senior startup analyst, 2000+ ideas reviewed. Honest, specific, never vague encouragement.

CONTEXT:
Project: ${context.projectName}
Build mode: ${buildModeConstraint(mode)}
User preferences: ${prefsLine}
User role: ${roleLine}

CONSTRAINTS:
Return ONLY valid JSON. No preamble. No explanation.
problem: one sentence, names exact WHO + WHAT pain.
solution: 2-3 sentences max, plain English.
icp.description: specific person (not "businesses" or "people").
clarityScore: 0-100, honest (most score 40-65 on first pass).
If idea is vague: list assumptions[], set clarityScore < 40.

OUTPUT SCHEMA (exact keys):
{ "problem", "solution", "icp": { "description", "demographics", "painPoints", "willingnessToPay" }, "assumptions", "clarityScore" }
icp.painPoints: string array. icp.demographics: string. icp.willingnessToPay: string.
assumptions: string array.`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const parsed = this.safeJsonParse(rawText)
    if (parsed.data && parsed.success) {
      const d = parsed.data
      let clarity = typeof d['clarityScore'] === 'number' ? d['clarityScore'] : 50
      clarity = Math.max(0, Math.min(100, clarity))
      const icpRaw = d['icp']
      let icp: Record<string, unknown> =
        icpRaw && typeof icpRaw === 'object' && !Array.isArray(icpRaw)
          ? { ...(icpRaw as Record<string, unknown>) }
          : {}
      if (typeof icp['description'] !== 'string') icp['description'] = ''
      if (!Array.isArray(icp['painPoints'])) icp['painPoints'] = []
      if (typeof icp['demographics'] !== 'string') icp['demographics'] = ''
      if (typeof icp['willingnessToPay'] !== 'string') icp['willingnessToPay'] = ''
      const out: Record<string, unknown> = {
        problem: typeof d['problem'] === 'string' ? d['problem'] : '',
        solution: typeof d['solution'] === 'string' ? d['solution'] : '',
        icp,
        assumptions: Array.isArray(d['assumptions']) ? d['assumptions'] : [],
        clarityScore: clarity,
      }
      return { data: out, success: true }
    }
    const snippet = rawText.trim().slice(0, 300)
    let clarity = 50
    const m = /"clarityScore"\s*:\s*(\d+)/.exec(rawText)
    if (m) {
      const n = Number(m[1])
      if (!Number.isNaN(n)) clarity = Math.max(0, Math.min(100, n))
    }
    return {
      data: {
        problem: snippet,
        solution: '',
        icp: { description: '', painPoints: [] as string[], demographics: '', willingnessToPay: '' },
        assumptions: [] as string[],
        clarityScore: clarity,
        _parseError: true,
      },
      success: false,
    }
  }
}
