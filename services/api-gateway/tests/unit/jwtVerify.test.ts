import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { Hono } from 'hono'
import { generateKeyPair, SignJWT } from 'jose'
import type { webcrypto } from 'node:crypto'

import { createJwtVerify, _resetPublicKeyCache } from '../../src/middleware/jwtVerify.js'

type CryptoKey = webcrypto.CryptoKey

// ── Key pair generated once for the whole suite ───────────────────────────────
let privateKey: CryptoKey
let publicKey: CryptoKey

beforeAll(async () => {
  const pair = await generateKeyPair('RS256')
  privateKey = pair.privateKey
  publicKey = pair.publicKey
})

afterEach(() => {
  _resetPublicKeyCache()
})

// ── Helper: mint a signed token ───────────────────────────────────────────────
async function mintToken(
  payload: Record<string, unknown> = {},
  opts: { expiresIn?: string | Date | number; issuer?: string; alg?: string } = {},
) {
  const alg = opts.alg ?? 'RS256'
  const { privateKey: signKey } = alg === 'RS256'
    ? { privateKey }
    : await generateKeyPair('HS256' as never) // wrong-alg test

  const builder = new SignJWT({ role: 'user', plan: 'free', ...payload })
    .setProtectedHeader({ alg })
    .setSubject('user-123')
    .setIssuedAt()
    .setIssuer(opts.issuer ?? 'ai-startup-builder')

  if (opts.expiresIn !== undefined) {
    builder.setExpirationTime(opts.expiresIn as string)
  }

  return builder.sign(signKey)
}

// ── Build a minimal Hono app with the middleware under test ───────────────────
function buildApp(middlewareOptions?: Parameters<typeof createJwtVerify>[0]) {
  const app = new Hono()
  // Inject the known public key so tests don't rely on env.JWT_PUBLIC_KEY_BASE64
  const mw = createJwtVerify({ ...middlewareOptions, publicKey })
  app.use('/*', mw)
  app.get('/protected', (c) => {
    const user = c.get('user' as never) as { sub?: string } | undefined
    return c.json({ ok: true, sub: user?.sub })
  })
  return app
}

// ─────────────────────────────────────────────────────────────────────────────

describe('jwtVerify middleware', () => {
  it('valid RS256 JWT passes and injects user context', async () => {
    const token = await mintToken({}, { expiresIn: '1h' })
    const app = buildApp()

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; sub: string }
    expect(body.ok).toBe(true)
    expect(body.sub).toBe('user-123')
  })

  it('expired JWT returns 401 with TOKEN_EXPIRED code', async () => {
    // Use a timestamp in the past — jose accepts Date objects for setExpirationTime
    const token = await mintToken({}, { expiresIn: new Date(Date.now() - 5000) })

    const app = buildApp()
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('TOKEN_EXPIRED')
  })

  it('JWT signed with wrong issuer returns 401 with INVALID_TOKEN code', async () => {
    const token = await mintToken({}, { expiresIn: '1h', issuer: 'wrong-issuer' })
    const app = buildApp()

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_TOKEN')
  })

  it('missing Authorization header returns 401', async () => {
    const app = buildApp()
    const res = await app.request('/protected')

    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('malformed Bearer token returns 401 INVALID_TOKEN', async () => {
    const app = buildApp()
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer not.a.jwt' },
    })

    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_TOKEN')
  })

  it('JWT signed with a different key-pair returns 401 INVALID_TOKEN', async () => {
    // Mint with a different private key than the one we inject as publicKey
    const { privateKey: wrongPriv } = await generateKeyPair('RS256')
    const token = await new SignJWT({ role: 'user', plan: 'free' })
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('hacker')
      .setIssuer('ai-startup-builder')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(wrongPriv)

    const app = buildApp()
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('INVALID_TOKEN')
  })

  it('optional mode: missing token passes through without user context', async () => {
    const app = new Hono()
    app.use('/*', createJwtVerify({ optional: true, publicKey }))
    app.get('/open', (c) => {
      const user = c.get('user' as never) as unknown
      return c.json({ hasUser: user != null })
    })

    const res = await app.request('/open')

    expect(res.status).toBe(200)
    const body = await res.json() as { hasUser: boolean }
    expect(body.hasUser).toBe(false)
  })

  it('optional mode: valid token still populates user context', async () => {
    const token = await mintToken({}, { expiresIn: '1h' })
    const app = new Hono()
    app.use('/*', createJwtVerify({ optional: true, publicKey }))
    app.get('/open', (c) => {
      const user = c.get('user' as never) as { sub?: string } | undefined
      return c.json({ sub: user?.sub })
    })

    const res = await app.request('/open', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { sub: string }
    expect(body.sub).toBe('user-123')
  })
})
