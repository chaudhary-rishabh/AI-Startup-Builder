/**
 * After email/password or OAuth login, use a full page load so the `access_token`
 * cookie is always present for the next request (avoids client-router races with middleware).
 */
export function navigateAfterLogin(options: { onboardingDone: boolean }): void {
  if (typeof window === 'undefined') return

  const skipOnboarding = process.env.NEXT_PUBLIC_SKIP_ONBOARDING_GUARD === 'true'

  let stored: string | null = null
  try {
    stored = sessionStorage.getItem('post_auth_redirect')
    if (stored) {
      sessionStorage.removeItem('post_auth_redirect')
    }
  } catch {
    /* ignore */
  }

  if (!options.onboardingDone && !skipOnboarding) {
    window.location.assign('/onboarding')
    return
  }

  const next = stored && stored.startsWith('/') ? stored : '/dashboard'
  window.location.assign(next)
}
