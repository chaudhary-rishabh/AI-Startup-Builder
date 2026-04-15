import { BaseAgent } from '../base.agent.js'
import {
  buildModeConstraint,
  readBuildMode,
  readUserPreferences,
  phase1AsRecord,
  phase2AsRecord,
  icpDescriptionFromPhase1,
} from '../prompt.helpers.js'

import type { AgentType, ProjectContext } from '@repo/types'

function mustHaveFeaturesWithDesc(context: ProjectContext): string {
  const p2 = phase2AsRecord(context)
  const features = p2['features']
  if (!Array.isArray(features)) return '(PRD features not loaded)'
  const lines: string[] = []
  for (const f of features) {
    if (!f || typeof f !== 'object' || Array.isArray(f)) continue
    const row = f as Record<string, unknown>
    if (row['priority'] !== 'must') continue
    const name = typeof row['name'] === 'string' ? row['name'] : 'Feature'
    const desc = typeof row['description'] === 'string' ? row['description'] : ''
    lines.push(`- ${name}: ${desc}`)
  }
  return lines.length ? lines.join('\n') : '(no must-have rows in PRD)'
}

function flowStepPreview(context: ProjectContext): string {
  const p2 = phase2AsRecord(context)
  const steps = p2['steps']
  if (!Array.isArray(steps)) return '(user flow not loaded)'
  const lines: string[] = []
  let n = 0
  for (const s of steps) {
    if (n >= 8) break
    if (!s || typeof s !== 'object' || Array.isArray(s)) continue
    const row = s as Record<string, unknown>
    const id = typeof row['id'] === 'string' ? row['id'] : `s${n}`
    const label = typeof row['label'] === 'string' ? row['label'] : ''
    lines.push(`- ${id}: ${label}`)
    n++
  }
  return lines.length ? lines.join('\n') : '(user flow not loaded)'
}

const DEFAULT_DESIGN_SYSTEM: Record<string, unknown> = {
  colors: {
    primary: '#3B82F6',
    background: '#F8FAFC',
    text: '#0F172A',
    muted: '#64748B',
    border: '#E2E8F0',
    success: '#22C55E',
    error: '#EF4444',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    h1: 'text-3xl font-bold',
    h2: 'text-xl font-semibold',
    body: 'text-base',
    small: 'text-sm text-slate-600',
  },
  spacing: { base: '1rem', card: '1.5rem', section: '2rem' },
  borderRadius: { button: '0.5rem', card: '0.75rem', input: '0.375rem' },
}

export class UiuxAgent extends BaseAgent {
  readonly agentType: AgentType = 'uiux'
  readonly phase = 2

  getAgentTask(): string {
    return 'Generate HTML prototypes and design system for core screens'
  }

  buildSystemPrompt(context: ProjectContext, documentContent: string): string {
    void documentContent
    const mode = readBuildMode(context)
    const prefs = readUserPreferences(context)
    const p1 = phase1AsRecord(context)
    const icp = icpDescriptionFromPhase1(p1)
    const color =
      prefs['primaryColor'] !== null &&
      prefs['primaryColor'] !== undefined &&
      prefs['primaryColor'] !== ''
        ? String(prefs['primaryColor'])
        : 'AI selects based on ICP'
    const feel =
      prefs['brandFeel'] !== null &&
      prefs['brandFeel'] !== undefined &&
      prefs['brandFeel'] !== ''
        ? String(prefs['brandFeel'])
        : 'AI selects'

    return `ROLE: Senior UI designer converting PRD to real rendered HTML prototypes.

CONTEXT:
ICP: ${icp}
Must-have features (with descriptions):
${mustHaveFeaturesWithDesc(context)}
User flow steps (first 8):
${flowStepPreview(context)}
User color preference: ${color}
Brand feel: ${feel}
Build mode: ${buildModeConstraint(mode)}

CONSTRAINTS:
screens: 4-7 screens maximum. Core path only.
Each screen: REAL HTML with Tailwind CSS classes.
NOT wireframe boxes or placeholders — real-looking prototype HTML.
Use <div class="min-h-screen..."> outer wrapper.
designSystem.colors: exact hex values only.
All screens must use same nav height, font, and primary color.
The HTML will render in an iframe immediately — must be valid.
Return raw JSON with html strings. No markdown inside JSON.

OUTPUT SCHEMA:
{ "screens":[{ "name","route","description","html" }],
  "designSystem":{ "colors":{ "primary","background","text","muted","border","success","error" },
    "typography":{ "fontFamily","h1","h2","body","small" },
    "spacing":{ "base","card","section" },
    "borderRadius":{ "button","card","input" } },
  "components":[{ "name","description","props" }],
  "screenCount" }
components[].props: string array.`
  }

  parseOutput(rawText: string): { data: Record<string, unknown>; success: boolean } {
    const parsed = this.safeJsonParse(rawText)
    if (!parsed.data || !parsed.success) {
      const ds = structuredClone(DEFAULT_DESIGN_SYSTEM) as Record<string, unknown>
      return {
        data: {
          screens: [
            {
              name: 'Home',
              route: '/',
              description: 'Landing',
              html: '<div class="min-h-screen bg-slate-50 p-6"><p class="text-slate-800">App shell</p></div>',
            },
          ],
          designSystem: ds,
          components: [],
          screenCount: 1,
        },
        success: false,
      }
    }
    const base = { ...parsed.data }
    let screens = base['screens']
    if (!Array.isArray(screens) || screens.length === 0) {
      screens = [
        {
          name: 'Home',
          route: '/',
          description: 'Landing',
          html: '<div class="min-h-screen bg-slate-50 p-6"><p class="text-slate-800">App shell</p></div>',
        },
      ]
    }
    const outScreens: Array<Record<string, unknown>> = []
    for (const sc of screens as unknown[]) {
      if (!sc || typeof sc !== 'object' || Array.isArray(sc)) continue
      const row = { ...(sc as Record<string, unknown>) }
      let html = typeof row['html'] === 'string' ? row['html'] : ''
      if (!html.trim()) {
        html =
          '<div class="min-h-screen bg-slate-50 p-6"><p class="text-slate-800">Screen</p></div>'
      }
      row['html'] = html
      outScreens.push(row)
    }
    base['screens'] = outScreens.slice(0, 7)

    let ds = base['designSystem']
    if (!ds || typeof ds !== 'object' || Array.isArray(ds)) {
      base['designSystem'] = structuredClone(DEFAULT_DESIGN_SYSTEM) as Record<string, unknown>
    } else {
      const dscopy = structuredClone(ds) as Record<string, unknown>
      const colors = dscopy['colors']
      if (!colors || typeof colors !== 'object' || Array.isArray(colors)) {
        dscopy['colors'] = { ...(DEFAULT_DESIGN_SYSTEM['colors'] as Record<string, unknown>) }
      } else {
        const c = colors as Record<string, unknown>
        if (typeof c['primary'] !== 'string' || !c['primary'].trim()) {
          c['primary'] = '#3B82F6'
        }
        dscopy['colors'] = c
      }
      const typo = dscopy['typography']
      if (!typo || typeof typo !== 'object' || Array.isArray(typo)) {
        dscopy['typography'] = structuredClone(
          DEFAULT_DESIGN_SYSTEM['typography'],
        ) as Record<string, unknown>
      }
      const sp = dscopy['spacing']
      if (!sp || typeof sp !== 'object' || Array.isArray(sp)) {
        dscopy['spacing'] = structuredClone(DEFAULT_DESIGN_SYSTEM['spacing']) as Record<string, unknown>
      }
      const br = dscopy['borderRadius']
      if (!br || typeof br !== 'object' || Array.isArray(br)) {
        dscopy['borderRadius'] = structuredClone(
          DEFAULT_DESIGN_SYSTEM['borderRadius'],
        ) as Record<string, unknown>
      }
      base['designSystem'] = dscopy
    }

    base['screenCount'] = (base['screens'] as unknown[]).length
    if (!Array.isArray(base['components'])) base['components'] = []

    return { data: base, success: true }
  }
}
