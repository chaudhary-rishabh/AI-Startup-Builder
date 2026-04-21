'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { getGoogleAuthStartUrl } from '@/api/auth.api'
import { setSessionTokens } from '@/lib/authTokens'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'

const GOOGLE_LOGO = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.2 0-5.8-2.7-5.8-6s2.6-6 5.8-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 3.7 14.5 2.8 12 2.8 7 2.8 3 6.9 3 12s4 9.2 9 9.2c5.2 0 8.7-3.7 8.7-8.8 0-.6-.1-1-.2-1.4H12z"
    />
  </svg>
)

type GoogleOAuthSuccess = {
  type: 'GOOGLE_OAUTH_SUCCESS'
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: {
    id: string
    email: string
    name: string
    role: string
    plan: string
    onboardingDone?: boolean
  }
  isNewUser: boolean
}

type GoogleOAuthMfa = {
  type: 'GOOGLE_OAUTH_MFA'
  mfaTempToken: string
}

type GoogleOAuthError = {
  type: 'GOOGLE_OAUTH_ERROR'
  error: string
  description: string
}

function isTrustedOAuthMessageOrigin(origin: string): boolean {
  if (origin === window.location.origin) return true
  const api = process.env.NEXT_PUBLIC_API_URL
  if (api) {
    try {
      if (origin === new URL(api).origin) return true
    } catch {
      /* ignore */
    }
  }
  const allow = process.env.NEXT_PUBLIC_OAUTH_MESSAGE_ORIGINS
  if (allow) {
    for (const o of allow.split(',')) {
      if (o.trim() === origin) return true
    }
  }
  // Local dev: OAuth callback HTML is often served from auth-service :4001 while the app is :3000
  if (process.env.NODE_ENV === 'development' && (origin === 'http://localhost:4001' || origin === 'https://localhost:4001')) {
    return true
  }
  return false
}

export function GoogleOAuthButton(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false)
  const setUser = useAuthStore((state) => state.setUser)
  const router = useRouter()
  const addToast = useUIStore((state) => state.addToast)

  useEffect(() => {
    function onMessage(event: MessageEvent<GoogleOAuthSuccess | GoogleOAuthMfa | GoogleOAuthError>): void {
      if (!isTrustedOAuthMessageOrigin(event.origin)) {
        return
      }
      const data = event.data
      if (!data || typeof data !== 'object' || !('type' in data)) {
        return
      }
      if (data.type === 'GOOGLE_OAUTH_MFA') {
        setIsLoading(false)
        addToast({
          type: 'info',
          title: '2FA required',
          message: 'Sign in with email and password to use your authenticator code.',
        })
        return
      }
      if (data.type === 'GOOGLE_OAUTH_ERROR') {
        setIsLoading(false)
        const desc =
          'description' in data && typeof data.description === 'string' ? data.description : ''
        addToast({
          type: 'error',
          title: 'Google sign-in',
          message: desc || 'Sign-in was cancelled or failed.',
        })
        return
      }
      if (data.type !== 'GOOGLE_OAUTH_SUCCESS') {
        return
      }
      setSessionTokens(data.accessToken, data.refreshToken, data.expiresIn)
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        avatarUrl: null,
        role: data.user.role as 'user' | 'admin' | 'super_admin',
        plan: data.user.plan as 'free' | 'pro' | 'team' | 'enterprise',
        onboardingDone: data.user.onboardingDone ?? false,
      })
      setIsLoading(false)
      if (data.isNewUser) {
        router.push('/onboarding')
        return
      }
      router.push('/dashboard')
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [addToast, router, setUser])

  const onClick = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const authUrl = await getGoogleAuthStartUrl()
      const width = 600
      const height = 650
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      window.open(
        authUrl,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars`,
      )
    } catch (error: unknown) {
      setIsLoading(false)
      const message = error instanceof Error ? error.message : 'Could not start Google sign-in'
      addToast({
        type: 'error',
        title: 'Google sign-in',
        message:
          message.includes('NEXT_PUBLIC_API_URL') || message.includes('not set')
            ? 'Set NEXT_PUBLIC_API_URL to your API gateway (e.g. http://localhost:4000) and restart the dev server.'
            : message,
      })
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={isLoading}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-divider bg-card text-sm font-medium text-heading shadow-sm transition hover:bg-output disabled:opacity-70"
    >
      {isLoading ? <LoadingSpinner /> : GOOGLE_LOGO}
      <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
    </button>
  )
}
