import type { ProjectContext } from '@repo/types'

import { readUserPreferences } from '../agents/prompt.helpers.js'

export interface ProjectSizeEstimate {
  totalFiles: number
  backendFiles: number
  frontendFiles: number
  tier: 'small' | 'standard' | 'large' | 'enterprise'
  architecture: 'single-repo' | 'monorepo' | 'microservices'
  estimatedMinutes: number
  estimatedBatches: number
}

type Arch = ProjectSizeEstimate['architecture']

function phase2Record(context: ProjectContext): Record<string, unknown> {
  const p = context.phase2Output as unknown
  return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {}
}

function mustFeaturesFromPhase2(p2: Record<string, unknown>): Array<Record<string, unknown>> {
  const prd = p2['prd']
  let features: unknown = p2['features']
  if (prd && typeof prd === 'object' && !Array.isArray(prd)) {
    const nested = (prd as Record<string, unknown>)['features']
    if (Array.isArray(nested)) features = nested
  }
  if (!Array.isArray(features)) return []
  return features.filter(
    (f) =>
      f &&
      typeof f === 'object' &&
      !Array.isArray(f) &&
      String((f as Record<string, unknown>)['priority']).toLowerCase() === 'must',
  ) as Array<Record<string, unknown>>
}

function architectureFromPhase2(p2: Record<string, unknown>): Arch {
  const sd = p2['systemDesign']
  const raw =
    sd && typeof sd === 'object' && !Array.isArray(sd)
      ? (sd as Record<string, unknown>)['architecture']
      : p2['architecture']
  const s = typeof raw === 'string' ? raw : 'single-repo'
  if (s === 'monorepo' || s === 'microservices' || s === 'single-repo') return s
  return 'single-repo'
}

function screensCount(context: ProjectContext): number {
  const p3 = context.phase3Output as unknown
  if (p3 && typeof p3 === 'object' && !Array.isArray(p3)) {
    const screens = (p3 as Record<string, unknown>)['screens']
    if (Array.isArray(screens) && screens.length > 0) return screens.length
  }
  return 4
}

function tierFromTotal(total: number): ProjectSizeEstimate['tier'] {
  if (total <= 25) return 'small'
  if (total <= 75) return 'standard'
  if (total <= 150) return 'large'
  return 'enterprise'
}

export function estimateProjectSize(context: ProjectContext): ProjectSizeEstimate {
  const p2 = phase2Record(context)
  const mustFeatures = mustFeaturesFromPhase2(p2)
  const mustFeatureCount = mustFeatures.length > 0 ? mustFeatures.length : 3

  const hasAuth = mustFeatures.some((f) => {
    const n = String(f['name'] ?? '').toLowerCase()
    return n.includes('auth') || n.includes('login') || n.includes('user')
  })
  const hasPayments = mustFeatures.some((f) => {
    const n = String(f['name'] ?? '').toLowerCase()
    return n.includes('pay') || n.includes('stripe') || n.includes('billing')
  })

  const prefs = readUserPreferences(context)
  const scaleRaw = prefs['scale']
  const scale = scaleRaw === 'production' ? 'production' : 'mvp'

  const screens = screensCount(context)

  const backendFilesPerDomain = 3
  const backendBase = 8
  let backendTotal =
    backendBase + mustFeatureCount * backendFilesPerDomain + (hasAuth ? 2 : 0) + (hasPayments ? 3 : 0)
  if (scale === 'production') backendTotal += 4

  const frontendFilesPerPage = scale === 'production' ? 3 : 2
  const frontendBase = 5
  let frontendTotal = frontendBase + screens * frontendFilesPerPage
  if (scale === 'production') frontendTotal += 6

  const total = backendTotal + frontendTotal
  const architecture = architectureFromPhase2(p2)

  return {
    totalFiles: total,
    backendFiles: backendTotal,
    frontendFiles: frontendTotal,
    tier: tierFromTotal(total),
    architecture,
    estimatedMinutes: Math.ceil(total * 0.4),
    estimatedBatches: Math.ceil(total / 7),
  }
}
