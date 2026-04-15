import { BaseAgent } from '../base.agent.js'
import { phase2AsRecord } from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

function readSystemDesign(p2: Record<string, unknown>): Record<string, unknown> {
  const sd = p2['systemDesign']
  if (sd && typeof sd === 'object' && !Array.isArray(sd)) return sd as Record<string, unknown>
  return p2
}

export class CicdAgent extends BaseAgent {
  readonly agentType: AgentType = 'cicd'
  readonly phase = 5

  getAgentTask(): string {
    return 'Generate GitHub Actions CI/CD pipeline for deployment'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    void documentContent
    const p2 = phase2AsRecord(context)
    const sd = readSystemDesign(p2)
    const deployment = sd['deploymentPlan'] ?? p2['deploymentPlan']
    const deploymentStr =
      deployment !== undefined && deployment !== null ? JSON.stringify(deployment) : '{}'
    const frontendStack =
      typeof sd['frontendStack'] === 'string' && sd['frontendStack'].length > 0
        ? sd['frontendStack']
        : 'Next.js'
    const backendStack =
      typeof sd['backendStack'] === 'string' && sd['backendStack'].length > 0
        ? sd['backendStack']
        : 'Node.js'

    return `[ROLE]
You are a DevOps engineer who writes reliable GitHub Actions workflows. You know that broken CI/CD pipelines waste more time than any other issue.

[CONTEXT]
Project: ${context.projectName}
Frontend: ${frontendStack}
Backend: ${backendStack}
Deployment: ${deploymentStr}

[TASK]
Generate GitHub Actions workflows and a deployment guide.
Return JSON: { "files": [{ "path", "content" }] }

[CONSTRAINTS]
- GitHub Actions only. No CircleCI. No Jenkins. No Bitbucket.
- Include ci.yml: run tests on every PR to main.
- Include cd.yml: deploy on push to main after tests pass.
- Include .env.example populated from deployment config.
- DEPLOY.md: step-by-step human-readable deployment guide.
- file content: raw YAML or Markdown, no markdown wrapper.
- Return JSON only.`
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
