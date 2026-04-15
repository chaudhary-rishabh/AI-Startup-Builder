import type { ProjectContext } from '@repo/types'

export type BuildMode = 'autopilot' | 'copilot' | 'manual'

type ContextWithProject = ProjectContext & {
  project?: {
    buildMode?: string
    userPreferences?: Record<string, unknown> | null
  }
}

export function readBuildMode(context: ProjectContext): BuildMode {
  const raw = (context as ContextWithProject).project?.buildMode
  if (raw === 'autopilot' || raw === 'copilot' || raw === 'manual') return raw
  return 'copilot'
}

export function buildModeConstraint(mode: BuildMode): string {
  if (mode === 'autopilot') return 'Generate complete, thorough output immediately.'
  if (mode === 'copilot') return 'Generate output ready for user review and possible refinement.'
  return 'Generate output — the user controls every subsequent step.'
}

export function readUserPreferences(context: ProjectContext): Record<string, unknown> {
  const p = (context as ContextWithProject).project?.userPreferences
  return p && typeof p === 'object' && !Array.isArray(p) ? p : {}
}

export function formatUserPreferencesLine(prefs: Record<string, unknown>): string {
  const scale = prefs['scale']
  const platform = prefs['platform']
  const primaryColor = prefs['primaryColor']
  const architecture = prefs['architecture']
  const brandFeel = prefs['brandFeel']
  const role = prefs['role']
  const deployment = prefs['deployment']
  const techSophistication = prefs['techSophistication']
  const fmt = (k: string, v: unknown) =>
    v === null || v === undefined || v === '' ? `${k}=AI decides` : `${k}=${String(v)}`
  return [
    fmt('scale', scale),
    fmt('platform', platform),
    fmt('color', primaryColor),
    fmt('architecture', architecture),
    fmt('feel', brandFeel),
    fmt('role', role),
    fmt('deployment', deployment),
    fmt('techSophistication', techSophistication),
  ].join(', ')
}

export function phase1AsRecord(context: ProjectContext): Record<string, unknown> {
  const p = context.phase1Output as unknown
  return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {}
}

export function phase2AsRecord(context: ProjectContext): Record<string, unknown> {
  const p = context.phase2Output as unknown
  return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {}
}

export function icpDescriptionFromPhase1(rec: Record<string, unknown>): string {
  const icp = rec['icp']
  if (typeof icp === 'string') return icp
  if (icp && typeof icp === 'object' && !Array.isArray(icp)) {
    const d = (icp as Record<string, unknown>)['description']
    if (typeof d === 'string') return d
  }
  return ''
}
