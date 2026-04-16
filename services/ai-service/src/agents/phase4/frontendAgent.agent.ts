import { BaseAgent } from '../base.agent.js'
import { phase2AsRecord } from '../prompt.helpers.js'
import { env } from '../../config/env.js'

import type { FileSpec } from '../../types/phase4.types.js'
import type { AgentType, ProjectContext } from '@repo/types'

function systemDesignRecord(context: ProjectContext): Record<string, unknown> {
  const p2 = phase2AsRecord(context)
  const nested = p2['systemDesign']
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  return p2
}

function uiuxRecord(context: ProjectContext): Record<string, unknown> {
  const p2 = phase2AsRecord(context)
  const u = p2['uiux']
  if (u && typeof u === 'object' && !Array.isArray(u)) return u as Record<string, unknown>
  return {}
}

function designTokens(context: ProjectContext): Record<string, unknown> {
  const u = uiuxRecord(context)
  const raw = u['designSystem'] ?? phase2AsRecord(context)['designSystem']
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  return {}
}

function projectServiceBase(): string {
  return env.PROJECT_SERVICE_URL.replace(/\/$/, '')
}

async function readPrototypeFromProjectFiles(projectId: string, path: string): Promise<string> {
  try {
    const url = `${projectServiceBase()}/internal/projects/${encodeURIComponent(projectId)}/files/content?path=${encodeURIComponent(path)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return ''
    const json = (await res.json()) as { success?: boolean; data?: { content?: string } }
    return typeof json.data?.content === 'string' ? json.data.content : ''
  } catch {
    return ''
  }
}

function apiEndpointsFull(
  context: ProjectContext,
): Array<{ method: string; path: string; description: string }> {
  const sd = systemDesignRecord(context)
  const raw = sd['apiEndpoints'] ?? phase2AsRecord(context)['apiEndpoints']
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

/** Deepest meaningful route segment or component stem (lowercase slug). */
export function extractScreenName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  const base = parts[parts.length - 1] ?? ''
  if (base.toLowerCase() === 'page.tsx' || base.toLowerCase() === 'page.ts') {
    const parent = parts[parts.length - 2] ?? ''
    if (parent.startsWith('(') && parent.endsWith(')')) {
      const grand = parts[parts.length - 3] ?? ''
      const slug = grand.replace(/[^\w-]+/g, '').toLowerCase()
      return slug.length > 0 ? slug : 'screen'
    }
    const slug = parent.replace(/[^\w-]+/g, '').toLowerCase()
    return slug.length > 0 ? slug : 'screen'
  }
  return base.replace(/\.tsx?$/i, '').replace(/[^\w-]+/g, '').toLowerCase() || 'screen'
}

export class FrontendAgent extends BaseAgent {
  readonly agentType: AgentType = 'frontend'
  readonly phase = 4

  getAgentTask(): string {
    return 'Generate React/Next.js pages from Phase 3 HTML prototypes'
  }

  buildSystemPrompt(_context: ProjectContext, _documentContent: string): string {
    return ''
  }

  parseOutput(_rawText: string): { data: Record<string, unknown>; success: boolean } {
    return { data: {}, success: false }
  }

  async buildFilePrompt(
    file: FileSpec,
    priorFilesContent: Array<{ path: string; content: string }>,
    context: ProjectContext,
  ): Promise<{ system: string; user: string }> {
    const p2sd = systemDesignRecord(context)
    const p2 = phase2AsRecord(context)
    const fromSd =
      typeof p2sd['frontendStack'] === 'string' && p2sd['frontendStack'].trim().length > 0
        ? String(p2sd['frontendStack']).trim()
        : ''
    const fromP2 =
      typeof p2['frontendStack'] === 'string' && String(p2['frontendStack']).trim().length > 0
        ? String(p2['frontendStack']).trim()
        : ''
    const frontendStack = (fromSd || fromP2 || 'Next.js 15').trim() || 'Next.js 15'

    const ds = designTokens(context)
    const colors =
      ds['colors'] && typeof ds['colors'] === 'object' && !Array.isArray(ds['colors'])
        ? (ds['colors'] as Record<string, unknown>)
        : {}
    const typo =
      ds['typography'] && typeof ds['typography'] === 'object' && !Array.isArray(ds['typography'])
        ? (ds['typography'] as Record<string, unknown>)
        : {}

    const primary = typeof colors['primary'] === 'string' ? colors['primary'] : '#3B82F6'
    const background = typeof colors['background'] === 'string' ? colors['background'] : '#FFFFFF'
    const text = typeof colors['text'] === 'string' ? colors['text'] : '#111827'
    const fontFamily =
      typeof typo['fontFamily'] === 'string' ? typo['fontFamily'] : 'Inter'

    const apiEndpoints = apiEndpointsFull(context)
    const screenName = extractScreenName(file.path)
    const projectId = context.projectId

    let prototypeHTML = await readPrototypeFromProjectFiles(
      projectId,
      `/prototypes/${screenName}.html`,
    )
    if (!prototypeHTML.trim()) {
      prototypeHTML = await readPrototypeFromProjectFiles(
        projectId,
        `/prototypes/${screenName.replace(/-/g, ' ')}.html`,
      )
    }

    const screenLower = screenName.toLowerCase()
    const relevantEndpoints = apiEndpoints.filter(
      (e) =>
        e.description.toLowerCase().includes(screenLower) ||
        e.path.toLowerCase().includes(screenLower),
    )

    const endpointsBlock =
      relevantEndpoints.length > 0
        ? relevantEndpoints.map((e) => `${e.method} ${e.path} — ${e.description}`).join('\n')
        : '(infer calls from page purpose and shared lib/api.ts)'

    const priorBlock =
      priorFilesContent.length > 0
        ? priorFilesContent
            .map(
              (f) => `=== ${f.path} (first 400 chars) ===
${f.content.substring(0, 400)}`,
            )
            .join('\n')
        : '(no prior frontend files in this batch yet)'

    const protoSection = prototypeHTML.trim()
      ? `
    HTML PROTOTYPE FOR THIS SCREEN (from Phase 3):
    Convert this HTML/Tailwind prototype to a proper ${frontendStack} component.
    Keep the layout, structure, and visual design. Replace static values with
    real data and proper state management.
    
    PROTOTYPE HTML:
    ${prototypeHTML.length > 3000 ? `${prototypeHTML.substring(0, 3000)}\n... [truncated — match the style shown]` : prototypeHTML}
    `
      : `[No prototype for this screen — create a clean, functional UI]`

    const system = `[ROLE]
You are a senior frontend engineer specializing in ${frontendStack}.
You write components that are accessible, type-safe, and handle all states.
You convert HTML prototypes into working React components without losing
the design intent.

[CONTEXT]
Project: ${context.projectName}
Framework: ${frontendStack}
File to generate: ${file.path}
Purpose: ${file.description}

Design system (use ONLY these values):
Primary color: ${primary}
Background: ${background}
Text: ${text}
Font: ${fontFamily}
${protoSection}

API endpoints this page calls:
${endpointsBlock}

Already generated frontend files (for import patterns):
${priorBlock}

[CONSTRAINTS]
Generate ONLY ${file.path}
- Convert prototype HTML to proper ${frontendStack} component.
- Handle THREE states: loading (skeleton), error (message + retry), success.
- Handle empty state (no data case).
- Import API calls from lib/api.ts (already generated).
- Use Tailwind classes from the design system only. No hardcoded hex values.
- No inline styles. No new npm packages beyond what is in package.json.
- Return raw ${frontendStack} code. No markdown. No \`\`\` wrapper.
  Start with first import. End with last line. Nothing else.`

    const user = `Generate the complete component: ${file.path}
${file.description}

${
  prototypeHTML.trim()
    ? 'The HTML prototype above shows the intended design. Convert it to a working component.'
    : 'Create a clean, functional component for this page.'
}

All states handled. All API calls wired. No placeholders.`

    return { system, user }
  }
}
