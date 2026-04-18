import api from '@/lib/axios'
import type {
  ActivityEvent,
  PlatformKPIs,
  RecentSignup,
  RevenueDataPoint,
  UserGrowthDataPoint,
} from '@/types'

function unwrap<T>(body: unknown): T {
  if (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    (body as { success: boolean }).success === true &&
    'data' in body
  ) {
    return (body as { data: T }).data
  }
  throw new Error('Unexpected API response')
}

export async function getPlatformKPIs(from: string, to: string): Promise<PlatformKPIs> {
  const body: unknown = await api.get('/admin/kpis', { params: { from, to } })
  return unwrap<PlatformKPIs>(body)
}

export async function getRevenueTimeSeries(
  from: string,
  to: string,
): Promise<RevenueDataPoint[]> {
  const body: unknown = await api.get('/admin/revenue', { params: { from, to } })
  return unwrap<RevenueDataPoint[]>(body)
}

export async function getUserGrowthTimeSeries(
  from: string,
  to: string,
): Promise<UserGrowthDataPoint[]> {
  const body: unknown = await api.get('/admin/user-growth', { params: { from, to } })
  return unwrap<UserGrowthDataPoint[]>(body)
}

export async function getRecentSignups(limit = 10): Promise<RecentSignup[]> {
  const body: unknown = await api.get('/admin/users/recent', {
    params: { limit },
  })
  return unwrap<RecentSignup[]>(body)
}

export async function getActivityFeed(limit = 20): Promise<ActivityEvent[]> {
  const body: unknown = await api.get('/admin/activity', { params: { limit } })
  return unwrap<ActivityEvent[]>(body)
}
