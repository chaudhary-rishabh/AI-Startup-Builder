import { Hono } from 'hono'

import { env } from '../config/env.js'
import * as refreshQueries from '../db/queries/refreshTokens.queries.js'
import * as usersQueries from '../db/queries/users.queries.js'
import { err, ok } from '../lib/response.js'
import {
  exchangeCodeForTokens,
  generateAuthUrl,
  handleOAuthCallback,
  isOAuthRouteError,
  type OAuthCallbackSuccess,
} from '../services/oauth.service.js'
import { hashToken } from '../services/password.service.js'

const oauth = new Hono()

function isBrowserOAuthRedirect(c: {
  req: {
    header: (name: string) => string | undefined
    path: string
    query: (name: string) => string | undefined
  }
}): boolean {
  // Google always redirects with ?code=&state= for the browser popup flow.
  // When proxied, Sec-Fetch-* headers may be missing — still return HTML for the popup.
  if (c.req.path.includes('oauth/google/callback') && c.req.query('code')) {
    return true
  }
  return (
    c.req.header('sec-fetch-mode') === 'navigate' ||
    c.req.header('sec-fetch-dest') === 'document'
  )
}

function mapPlanTier(tier: string): 'free' | 'pro' | 'team' | 'enterprise' {
  if (tier === 'pro' || tier === 'team' || tier === 'enterprise') return tier
  return 'free'
}

/** Minimal HTML page that posts OAuth result to opener and closes the popup (browser only). */
function oauthPopupHtml(targetOrigin: string, message: Record<string, unknown>): string {
  const json = JSON.stringify(message).replace(/</g, '\\u003c')
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Google sign-in</title></head>
<body>
<script>
(function(){
  var p=${json};
  try {
    if(window.opener&&!window.opener.closed){window.opener.postMessage(p,${JSON.stringify(targetOrigin)});}
  } catch(e){}
  window.close();
})();
</script>
<p>Signing in…</p>
</body></html>`
}

oauth.get('/oauth/google', async (c) => {
  try {
    const { url, state } = await generateAuthUrl()
    return ok(c, { authUrl: url, state })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start Google sign-in'
    console.error('[auth-service] OAuth generateAuthUrl failed:', e)
    return err(c, 500, 'INTERNAL_ERROR', msg)
  }
})

oauth.get('/oauth/google/callback', async (c) => {
  const oauthError = c.req.query('error')
  if (oauthError) {
    const frontend = env.FRONTEND_APP_URL.replace(/\/$/, '')
    const description = c.req.query('error_description') ?? oauthError
    return c.redirect(
      `${frontend}/auth/callback?error=${encodeURIComponent(oauthError)}&error_description=${encodeURIComponent(description)}`,
      302,
    )
  }

  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code || !state) {
    return err(c, 400, 'INVALID_REQUEST', 'Missing code or state parameter')
  }

  try {
    const { userInfo, tokens } = await exchangeCodeForTokens(code, state)
    const result = await handleOAuthCallback(userInfo, tokens)

    if ('requiresMfa' in result && result.requiresMfa) {
      if (isBrowserOAuthRedirect(c)) {
        const targetOrigin = new URL(env.FRONTEND_APP_URL).origin
        return c.html(
          oauthPopupHtml(targetOrigin, {
            type: 'GOOGLE_OAUTH_MFA',
            mfaTempToken: result.mfaTempToken,
          }),
        )
      }
      return ok(c, { requiresMfa: true, mfaTempToken: result.mfaTempToken })
    }

    const { user, isNewUser, tokenPair } = result as OAuthCallbackSuccess
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown'
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TOKEN_TTL * 1000)
    await refreshQueries.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(tokenPair.refreshToken),
      deviceInfo: { ua: c.req.header('user-agent') ?? '', ip },
      expiresAt,
    })
    await usersQueries.updateLastActive(user.id)

    if (isBrowserOAuthRedirect(c)) {
      const targetOrigin = new URL(env.FRONTEND_APP_URL).origin
      return c.html(
        oauthPopupHtml(targetOrigin, {
          type: 'GOOGLE_OAUTH_SUCCESS',
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
          user: {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role,
            plan: mapPlanTier(user.planTier),
            onboardingDone: user.onboardingCompleted,
          },
          isNewUser,
        }),
      )
    }

    return ok(c, {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        planTier: user.planTier,
      },
      isNewUser,
    })
  } catch (e: unknown) {
    if (isOAuthRouteError(e)) {
      return err(c, e.status, e.code, e.message, e.details)
    }
    if (e instanceof Error && e.message === 'Invalid OAuth state') {
      return err(c, 400, 'INVALID_REQUEST', e.message)
    }
    if (
      e instanceof Error &&
      (e.message.startsWith('Google ') || e.message.includes('Google token'))
    ) {
      console.error('[auth-service] Google OAuth token/userinfo error:', e)
      return err(c, 502, 'BAD_GATEWAY', 'Unable to complete Google sign-in')
    }
    console.error('[auth-service] OAuth callback failed:', e)
    throw e
  }
})

export default oauth
