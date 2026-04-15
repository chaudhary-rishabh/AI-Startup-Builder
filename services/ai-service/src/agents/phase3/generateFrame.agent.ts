import { BaseAgent, type AgentExecutionInput, type AgentRunResult } from '../base.agent.js'
import { phase2AsRecord, phase3AsRecord } from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

type ContextWithProject = ProjectContext & {
  project?: { name?: string; buildMode?: string; userPreferences?: Record<string, unknown> | null }
}

function readPhase2UiuxDesign(context: ProjectContext): {
  colorPrimary: string
  colorBg: string
  colorText: string
  fontFamily: string
} {
  const p2 = phase2AsRecord(context)
  const uiux =
    p2['uiux'] && typeof p2['uiux'] === 'object' && !Array.isArray(p2['uiux'])
      ? (p2['uiux'] as Record<string, unknown>)
      : undefined
  const dsRaw = uiux?.['designSystem'] ?? p2['designSystem']
  const ds =
    dsRaw && typeof dsRaw === 'object' && !Array.isArray(dsRaw)
      ? (dsRaw as Record<string, unknown>)
      : {}
  const colors =
    ds['colors'] && typeof ds['colors'] === 'object' && !Array.isArray(ds['colors'])
      ? (ds['colors'] as Record<string, unknown>)
      : {}
  const typo =
    ds['typography'] && typeof ds['typography'] === 'object' && !Array.isArray(ds['typography'])
      ? (ds['typography'] as Record<string, unknown>)
      : {}
  return {
    colorPrimary: typeof colors['primary'] === 'string' ? colors['primary'] : '#3B82F6',
    colorBg: typeof colors['background'] === 'string' ? colors['background'] : '#FFFFFF',
    colorText: typeof colors['text'] === 'string' ? colors['text'] : '#111827',
    fontFamily: typeof typo['fontFamily'] === 'string' ? typo['fontFamily'] : 'Inter',
  }
}

function readMustHaveFeatures(context: ProjectContext): Array<{ name: string; description: string }> {
  const p2 = phase2AsRecord(context)
  const prd =
    p2['prd'] && typeof p2['prd'] === 'object' && !Array.isArray(p2['prd'])
      ? (p2['prd'] as Record<string, unknown>)
      : undefined
  const raw = (prd?.['features'] ?? p2['features']) as unknown
  if (!Array.isArray(raw)) return []
  const out: Array<{ name: string; description: string }> = []
  for (const f of raw) {
    if (!f || typeof f !== 'object' || Array.isArray(f)) continue
    const row = f as Record<string, unknown>
    if (row['priority'] !== 'must') continue
    const name = typeof row['name'] === 'string' ? row['name'] : 'Feature'
    const description = typeof row['description'] === 'string' ? row['description'] : ''
    out.push({ name, description })
  }
  return out
}

function readExistingScreens(context: ProjectContext): Array<{ screenName: string; html: string }> {
  const p3 = phase3AsRecord(context)
  const screens = p3['screens']
  if (!Array.isArray(screens)) return []
  const out: Array<{ screenName: string; html: string }> = []
  for (const s of screens) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) continue
    const row = s as Record<string, unknown>
    const sn = typeof row['screenName'] === 'string' ? row['screenName'] : ''
    const html = typeof row['html'] === 'string' ? row['html'] : ''
    if (sn) out.push({ screenName: sn, html })
  }
  return out
}

export class GenerateFrameAgent extends BaseAgent {
  readonly agentType: AgentType = 'generate_frame'
  readonly phase = 3

  private _screenNameForParse = ''

  getScreenName(userMessage?: string): string {
    return userMessage?.trim() || 'Screen'
  }

  getAgentTask(): string {
    return 'Generate HTML/Tailwind prototype for one UI screen'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    void documentContent
    const { colorPrimary, colorBg, colorText, fontFamily } = readPhase2UiuxDesign(context)
    const mustHave = readMustHaveFeatures(context)
    const existingScreens = readExistingScreens(context)
    const projectName =
      (context as ContextWithProject).project?.name?.trim() || context.projectName || 'this product'
    const screenName = this._screenNameForParse || 'Screen'

    const mustBlock = mustHave
      .slice(0, 5)
      .map((f) => `- ${f.name}: ${f.description}`)
      .join('\n')

    const existingBlock =
      existingScreens.length > 0
        ? `
Existing screens (match their nav structure and colors exactly):
${existingScreens
  .slice(-2)
  .map(
    (s) =>
      `Screen: ${s.screenName}\nFirst 300 chars: ${s.html.length > 300 ? s.html.substring(0, 300) : s.html}`,
  )
  .join('\n---\n')}
`
        : 'This is the first screen — establish the visual style.'

    return `[ROLE]
You are a senior UI designer converting product requirements into real HTML prototypes. You write clean, valid Tailwind CSS that renders correctly in a browser iframe at 1440px wide.

[CONTEXT]
Project: ${projectName}

Design system (use EXACTLY these values):
  Primary color: ${colorPrimary}
  Background: ${colorBg}
  Text: ${colorText}
  Font: ${fontFamily}

Must-have features for content reference:
${mustBlock || '- (none specified)'}

${existingBlock}

[TASK]
Generate the HTML prototype for: ${screenName}

[CONSTRAINTS]
- Return ONLY the HTML body content. Nothing else.
- No <html>, <head>, <body>, or <!DOCTYPE> tags.
- No markdown. No code blocks. No explanation.
- Use ONLY Tailwind CSS classes. No inline styles. No <style> tags.
- Use ONLY the exact brand colors listed above.
- Navigation height, fonts, and colors must match existing screens.
- Use realistic placeholder content specific to ${projectName}.
- Images: use colored div with descriptive text label.
- Minimum height: full viewport. Start with outer <div class="min-h-screen...">
- Start with the first <div. End with the closing </div>. Nothing else.`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const screenName = this._screenNameForParse || 'Screen'
    const trimmed = rawText.trim()
    const hasDiv = trimmed.includes('<div')
    const hasHtmlTag = /<html|<head|<body/i.test(trimmed)
    const hasTailwind = /class="/i.test(trimmed)
    const route = `/${screenName.toLowerCase().replace(/\s+/g, '-')}`
    const generatedAt = new Date().toISOString()

    if (hasDiv && !hasHtmlTag && hasTailwind) {
      return {
        data: {
          frame: {
            screenName,
            html: trimmed,
            route,
            generatedAt,
          },
          screenName,
        },
        success: true,
      }
    }

    return {
      data: {
        frame: {
          screenName: 'Generated Screen',
          html: `<div class="min-h-screen bg-gray-50 flex items-center justify-center">
                   <p class="text-gray-500">Screen generation failed — please retry</p>
                 </div>`,
          route: '/screen',
          generatedAt,
        },
        screenName: 'Generated Screen',
        _parseError: true,
      },
      success: false,
    }
  }

  override async run(
    input: AgentExecutionInput,
    onChunk: (chunk: string) => void,
    onProgress?: (event: string) => void,
  ): Promise<AgentRunResult> {
    this._screenNameForParse = this.getScreenName(input.userMessage)
    const synthetic =
      input.userMessage?.trim().length && input.userMessage.trim().length > 0
        ? input.userMessage
        : `Generate the HTML prototype for: ${this._screenNameForParse}`
    try {
      return await super.run({ ...input, userMessage: synthetic }, onChunk, onProgress)
    } finally {
      this._screenNameForParse = ''
    }
  }
}
