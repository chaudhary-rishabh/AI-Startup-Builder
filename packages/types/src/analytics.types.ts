export interface PlatformEvent {
  id: string
  userId: string | null
  projectId: string | null
  eventType: string
  properties: Record<string, unknown>
  sessionId: string | null
  ipHash: string | null
  userAgent: string | null
  createdAt: string
}

export interface AuditLog {
  id: string
  adminId: string
  action: string
  targetType: 'user' | 'project' | 'plan' | 'feature_flag' | 'subscription'
  targetId: string | null
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

export interface KPIData {
  mau: TimeSeriesPoint[]
  dau: TimeSeriesPoint[]
  mrr: TimeSeriesPoint[]
  churnRate: number
  newSignups: number
}

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface FunnelData {
  signup: number
  phase1Complete: number
  phase2Complete: number
  phase6Complete: number
  subscribed: number
  conversionRates: Record<string, number>
}
