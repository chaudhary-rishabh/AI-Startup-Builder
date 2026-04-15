import { BaseAgent } from '../base.agent.js'
import { phase1AsRecord, icpDescriptionFromPhase1 } from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

function readIcpRecord(p1: Record<string, unknown>): Record<string, unknown> {
  const icp = p1['icp']
  if (icp && typeof icp === 'object' && !Array.isArray(icp)) return icp as Record<string, unknown>
  return {}
}

export class FeedbackAnalyzerAgent extends BaseAgent {
  readonly agentType: AgentType = 'feedback_analyzer'
  readonly phase = 6

  getAgentTask(): string {
    return 'Analyze customer feedback themes, sentiment, and feature requests'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    const p1 = phase1AsRecord(context)
    const icp = readIcpRecord(p1)
    const icpDesc = icpDescriptionFromPhase1(p1) || (typeof icp['description'] === 'string' ? icp['description'] : 'not specified')
    const painLine = Array.isArray(icp['painPoints'])
      ? icp['painPoints'].map(String).join(', ')
      : 'not specified'

    const docBlock = documentContent.trim().length
      ? `
[KNOWLEDGE BASE — from user's uploaded customer interviews / feedback data]
${documentContent}
`
      : '[No customer feedback documents uploaded]'

    return `[ROLE]
You are a customer research analyst who turns raw feedback into actionable product decisions. You only report what has evidence.

[CONTEXT]
Project: ${context.projectName}
ICP: ${icpDesc}
ICP Pain points: ${painLine}

${docBlock}

[TASK]
Analyze the customer feedback above (if provided) and return findings.
Return JSON: { "themes", "sentiment", "topRequests", "recommendations" }

[CONSTRAINTS]
- Only report themes with evidence from the documents.
- If no documents provided: return empty themes with a note explaining.
- No invented feedback. Every theme must cite its source.
- Each theme: { "name", "description", "evidenceCount", "quotes": string[] }
- Return JSON only.`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const parsed = this.safeJsonParse(rawText)
    const base: Record<string, unknown> = parsed.data && parsed.success ? { ...parsed.data } : {}
    let themes = base['themes']
    if (!Array.isArray(themes)) themes = []
    base['themes'] = themes
    return { data: base, success: parsed.success }
  }
}
