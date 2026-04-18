import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

let isRefreshing = false
let refreshSubscribers: Array<() => void> = []

const subscribeTokenRefresh = (cb: () => void) => {
  refreshSubscribers.push(cb)
}

const onRefreshComplete = () => {
  refreshSubscribers.forEach((cb) => cb())
  refreshSubscribers = []
}

function extractLockoutEndsAt(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const err = (data as { error?: Record<string, unknown> }).error
  if (!err || typeof err !== 'object') return undefined
  const details = err.details as { lockoutEndsAt?: string } | undefined
  if (details?.lockoutEndsAt) return details.lockoutEndsAt
  if (typeof err.lockoutEndsAt === 'string') return err.lockoutEndsAt
  return undefined
}

api.interceptors.response.use(
  (res) => res.data,

  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean
    }

    const requestUrl = String(original?.url ?? '')
    const skipRefresh =
      requestUrl.includes('/auth/admin/login') ||
      requestUrl.includes('/auth/admin/verify-totp')

    if (
      error.response?.status === 401 &&
      !original._retried &&
      !skipRefresh
    ) {
      original._retried = true

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => resolve(api(original)))
        })
      }

      isRefreshing = true
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'}/auth/admin/refresh`,
          {},
          { withCredentials: true },
        )
        onRefreshComplete()
        isRefreshing = false
        return api(original)
      } catch {
        isRefreshing = false
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login?expired=1'
        }
        return Promise.reject(error)
      }
    }

    const data = error.response?.data as
      | { error?: { code?: string; message?: string } }
      | undefined
    const lockoutEndsAt = extractLockoutEndsAt(error.response?.data)
    const normalised = {
      code: data?.error?.code ?? 'UNKNOWN_ERROR',
      message: data?.error?.message ?? error.message,
      status: error.response?.status ?? 0,
      ...(lockoutEndsAt ? { lockoutEndsAt } : {}),
    }
    return Promise.reject(normalised)
  },
)

export default api
