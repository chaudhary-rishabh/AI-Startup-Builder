'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Handles OAuth redirects to the **web app** origin (e.g. Google error redirects).
 * Successful sign-in uses PKCE and completes on the API (`/auth/oauth/google/callback`),
 * which returns HTML that `postMessage`s to the opener.
 */
export default function OAuthCallbackPage(): JSX.Element {
  const params = useSearchParams()

  useEffect(() => {
    const oauthError = params.get('error')
    const description = params.get('error_description')
    if (oauthError) {
      window.opener?.postMessage(
        {
          type: 'GOOGLE_OAUTH_ERROR',
          error: oauthError,
          description: description ?? '',
        },
        window.location.origin,
      )
      window.close()
      return
    }

    const code = params.get('code')
    if (code) {
      window.opener?.postMessage(
        {
          type: 'GOOGLE_OAUTH_ERROR',
          error: 'misconfigured_redirect',
          description:
            'Google redirected here with a code, but sign-in must complete on the API. Set GOOGLE_REDIRECT_URI to your gateway callback (e.g. http://localhost:4000/auth/oauth/google/callback) in auth-service and in Google Cloud Console.',
        },
        window.location.origin,
      )
      window.close()
      return
    }

    window.close()
  }, [params])

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <p className="text-sm text-heading">Completing Google sign in...</p>
    </main>
  )
}
