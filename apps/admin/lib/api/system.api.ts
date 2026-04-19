import api from '@/lib/axios'
import type { ErrorLogEntry, LatencyDataPoint, ServiceHealthCard } from '@/types'
import { unwrap } from '@/lib/api/envelope'

export async function getServiceHealth(): Promise<ServiceHealthCard[]> {
  const body: unknown = await api.get('/admin/system/health')
  return unwrap<ServiceHealthCard[]>(body)
}

export async function getErrorLog(params: {
  severity?: string
  page?: number
  limit?: number
}): Promise<{ errors: ErrorLogEntry[]; total: number }> {
  const body: unknown = await api.get('/admin/system/errors', { params })
  return unwrap<{ errors: ErrorLogEntry[]; total: number }>(body)
}

export async function getLatencyTimeSeries(): Promise<LatencyDataPoint[]> {
  const body: unknown = await api.get('/admin/system/latency')
  return unwrap<LatencyDataPoint[]>(body)
}

export async function createIncident(payload: {
  title: string
  description: string
  severity: 'minor' | 'major' | 'critical'
}): Promise<void> {
  const body: unknown = await api.post('/admin/system/incidents', payload)
  unwrap<Record<string, never>>(body)
}
