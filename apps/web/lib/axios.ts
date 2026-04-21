import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

import { clearSessionTokens, getAccessToken, getRefreshToken, setSessionTokens } from '@/lib/authTokens'

interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '',
  withCredentials: true,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

let isRefreshing = false
let refreshSubscribers: Array<() => void> = []

const notifyRefreshSubscribers = (): void => {
  for (const callback of refreshSubscribers) {
    callback()
  }
  refreshSubscribers = []
}

function shouldSkipAuthHeader(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/verify-email') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/oauth/')
  )
}

api.interceptors.request.use((config) => {
  const url = String(config.url ?? '')
  if (typeof window !== 'undefined' && !shouldSkipAuthHeader(url)) {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetryableAxiosRequestConfig | undefined
    const requestUrl = String(original?.url ?? '')
    const isAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/verify-email') ||
      requestUrl.includes('/auth/refresh')

    if (error.response?.status === 401 && original && !original._retry && !isAuthRequest) {
      original._retry = true

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push(() => {
            resolve(api(original))
          })
        })
      }

      isRefreshing = true
      try {
        const refresh = getRefreshToken()
        if (!refresh) {
          throw new Error('No refresh token')
        }
        const res = await api.post<{
          data: { accessToken: string; refreshToken: string; expiresIn: number }
        }>('/auth/refresh', { refreshToken: refresh })
        const d = res.data.data
        setSessionTokens(d.accessToken, d.refreshToken, d.expiresIn)
        isRefreshing = false
        notifyRefreshSubscribers()
        return api(original)
      } catch (refreshError) {
        isRefreshing = false
        refreshSubscribers = []
        clearSessionTokens()
        if (typeof window !== 'undefined') {
          window.location.href = '/?expired=1'
        }
        return Promise.reject(refreshError)
      }
    }

    const appError = {
      code: error.response?.data?.error?.code ?? 'NETWORK_ERROR',
      message: error.response?.data?.error?.message ?? error.message ?? 'An unexpected error occurred',
      status: error.response?.status ?? 0,
    }

    return Promise.reject(appError)
  },
)

export default api
